export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function GET(request: NextRequest) {
  if (!stripe) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!supabaseAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");

  // ⭐ 1: Hent metadata fra query parameters (fra registrering)
  const queryCompanyName = url.searchParams.get("company_name");
  const queryFullName = url.searchParams.get("full_name");

  console.log("[callback] Query params - company_name:", queryCompanyName, "full_name:", queryFullName);

  // ⭐ 1: Opprett supabase-klient FØR vi lager response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Vi setter cookies manuelt senere
        },
      },
    }
  );

  // ⭐ 2: Hent session direkte fra exchange / verify — unngår å lese gamle cookies
  let newSession = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[callback] exchangeCodeForSession error:", error);
    else newSession = data.session;
  }

  if (token && type === "signup") {
    const email = url.searchParams.get("email");
    const verifyPayload: any = { token, type: "signup" };
    if (email) verifyPayload.email = email;

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp(verifyPayload);
    if (verifyError) console.error("[callback] verifyOtp error:", verifyError);
    else newSession = verifyData.session;
  }

  // ⭐ 3: Bruk bruker direkte fra den nye sesjonen
  const user = newSession?.user ?? null;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ⭐ 4: Hent metadata — fra user_metadata (satt ved signUp), fallback til query params
  const company_name = user.user_metadata?.company_name || queryCompanyName || "Mitt firma";
  const full_name = user.user_metadata?.full_name || queryFullName || user.email?.split('@')[0] || "Bruker";

  // ⭐ 5: Sjekk om profil finnes
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let profile = existingProfile;

  // ⭐ 8: Opprett profil + Stripe-kunde hvis ny bruker
  if (!existingProfile) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });

    const { data: newProfile } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: user.id,
        company_name,
        full_name,
        stripe_customer_id: customer.id,
        subscription_status: "trialing",
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
      })
      .select()
      .single();

    profile = newProfile;

    // Opprett account + account_users — håndter både manglende og trigger-opprettede
    const { data: existingAccountUser } = await supabaseAdmin
      .from("account_users")
      .select("account_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingAccountUser) {
      // Ingen account_users — opprett account og koble til
      const { data: newAccount, error: accountError } = await supabaseAdmin
        .from("accounts")
        .insert({
          name: company_name,
          subscription_status: "trialing",
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
          stripe_customer_id: customer.id,
          signing_method: "otp_email",
        })
        .select()
        .single();

      if (accountError) console.error("[callback] accounts insert error:", accountError);

      if (newAccount) {
        const { error: auError } = await supabaseAdmin
          .from("account_users")
          .insert({ account_id: newAccount.id, user_id: user.id, role: "admin" });

        if (auError) console.error("[callback] account_users insert error:", auError);

        await supabaseAdmin
          .from("profiles")
          .update({ account_id: newAccount.id })
          .eq("user_id", user.id);
      }
    } else if (existingAccountUser.role !== "admin") {
      // Trigger opprettet account_users med feil rolle — korriger til admin
      await supabaseAdmin
        .from("account_users")
        .update({ role: "admin" })
        .eq("user_id", user.id);

      console.log("[callback] Korrigerte rolle til admin for ny bruker:", user.id);
    }
  }

  // ⭐ 9: Lag redirect-response og sett cookies fra den nye sesjonen
  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  if (newSession) {
    const secure = process.env.NODE_ENV === "production";

    response.cookies.set("sb-access-token", newSession.access_token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
    });

    response.cookies.set("sb-refresh-token", newSession.refresh_token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
    });

    // Temp-cookie slik at AuthProvider kan kalle setSession() på klientsiden
    response.cookies.set("temp_session", JSON.stringify({
      access_token: newSession.access_token,
      refresh_token: newSession.refresh_token,
    }), {
      path: "/",
      httpOnly: false,
      secure,
      sameSite: "lax",
      maxAge: 60,
    });
  }

  return response;
}
