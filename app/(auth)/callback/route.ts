export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function GET(request: NextRequest) {
  if (!stripe) return NextResponse.redirect(new URL("/login", request.url));
  if (!supabaseAdmin) return NextResponse.redirect(new URL("/login", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");
  const queryCompanyName = url.searchParams.get("company_name");
  const queryFullName = url.searchParams.get("full_name");

  // Response opprettes FØRST slik at setAll kan sette Supabase-cookies direkte
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const secure = process.env.NODE_ENV === "production";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Supabase setter sine egne cookies direkte på response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Hent session direkte fra exchange / verify
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
    const { data, error } = await supabase.auth.verifyOtp(verifyPayload);
    if (error) console.error("[callback] verifyOtp error:", error);
    else newSession = data.session;
  }

  const user = newSession?.user ?? null;
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // Sett sb-access-token for middleware-kompatibilitet
  response.cookies.set("sb-access-token", newSession!.access_token, {
    path: "/", httpOnly: true, secure, sameSite: "lax",
  });
  response.cookies.set("sb-refresh-token", newSession!.refresh_token, {
    path: "/", httpOnly: true, secure, sameSite: "lax",
  });

  // Metadata
  const company_name = user.user_metadata?.company_name || queryCompanyName || "Mitt firma";
  const full_name = user.user_metadata?.full_name || queryFullName || user.email?.split('@')[0] || "Bruker";

  // Sjekk om Stripe-kunde og profil allerede finnes
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Hent eller opprett Stripe-kunde
  let stripeCustomerId = existingProfile?.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    stripeCustomerId = customer.id;
  }

  // Upsert profil
  await supabaseAdmin
    .from("profiles")
    .upsert({
      user_id: user.id,
      company_name,
      full_name,
      stripe_customer_id: stripeCustomerId,
      subscription_status: "trialing",
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
    }, { onConflict: "user_id" });

  // Sjekk account_users — opprett eller korriger rolle
  const { data: existingAccountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingAccountUser) {
    const { data: newAccount, error: accountError } = await supabaseAdmin
      .from("accounts")
      .insert({
        name: company_name,
        subscription_status: "trialing",
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
        stripe_customer_id: stripeCustomerId,
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
  } else {
    if (existingAccountUser.role !== "admin") {
      await supabaseAdmin
        .from("account_users")
        .update({ role: "admin" })
        .eq("user_id", user.id);
    }
    if (!existingProfile?.account_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ account_id: existingAccountUser.account_id })
        .eq("user_id", user.id);
    }
  }

  return response;
}
