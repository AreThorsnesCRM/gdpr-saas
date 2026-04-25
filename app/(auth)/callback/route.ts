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

  // ⭐ 2: Magic link / OAuth
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // ⭐ 3: Email verification
  if (token && type === "signup") {
    const email = url.searchParams.get("email");
    const verifyPayload: any = {
      token,
      type: "signup",
    }

    if (email) {
      verifyPayload.email = email
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp(verifyPayload)
    if (verifyError) {
      console.error("[callback] verifyOtp error:", verifyError)
    } else {
      console.log("[callback] verifyOtp data:", verifyData)
    }
  }

  // ⭐ 4: Hent bruker etter session er satt
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  console.log("[callback] User object:", user);
  console.log("[callback] User metadata:", user.user_metadata);

  // ⭐ 5: Prøv å hente metadata fra bruker-objektet direkte
  let company_name = user.user_metadata?.company_name ?? null;
  let full_name = user.user_metadata?.full_name ?? null;

  console.log("[callback] Metadata from user object - company_name:", company_name, "full_name:", full_name);

  // ⭐ 6: Hvis ikke funnet, prøv query params (fra registrering)
  if (!company_name && queryCompanyName) {
    company_name = queryCompanyName;
    console.log("[callback] Using company_name from query params:", company_name);
  }

  if (!full_name && queryFullName) {
    full_name = queryFullName;
    console.log("[callback] Using full_name from query params:", full_name);
  }

  console.log("[callback] Final metadata - company_name:", company_name, "full_name:", full_name);

  // ⭐ 7: Sjekk om profil finnes
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let profile = existingProfile;

  // ⭐ 8: Opprett profil + Stripe-kunde hvis ny bruker
  if (!existingProfile) {
    // ⭐ 8.1: Sørg for at metadata er tilgjengelig
    if (!company_name || !full_name) {
      console.log("[callback] Missing metadata, trying to update user metadata first...");

      // Prøv å oppdatere brukerens metadata først
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: full_name || user.user_metadata?.full_name,
          company_name: company_name || user.user_metadata?.company_name,
        }
      });

      if (updateError) {
        console.error("[callback] Failed to update user metadata:", updateError);
      } else {
        console.log("[callback] Updated user metadata successfully");
        // Hent metadata på nytt
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        company_name = updatedUser?.user_metadata?.company_name ?? company_name;
        full_name = updatedUser?.user_metadata?.full_name ?? full_name;
        console.log("[callback] Updated metadata:", { company_name, full_name });
      }
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });

    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        company_name: company_name || "Firma mangler",
        full_name: full_name || user.email?.split('@')[0] || "Bruker",
        stripe_customer_id: customer.id,
        subscription_status: "trialing",
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
      })
      .select()
      .single();

    profile = newProfile;
  }

  // ⭐ 8: Legg inn subscription-status i JWT (viktig for middleware)
  if (profile) {
    await supabase.auth.updateUser({
      data: {
        subscription_status: profile.subscription_status,
        trial_end: profile.trial_end,
      },
    });
  }

  // ⭐ 9: Hent session for å sette cookies manuelt
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("[callback] Session metadata:", session?.user?.user_metadata);

  // ⭐ 10: Prøv å hente metadata fra session også
  if (!company_name && session?.user?.user_metadata) {
    company_name = session.user.user_metadata.company_name ?? null;
    full_name = session.user.user_metadata.full_name ?? null;
    console.log("[callback] Got metadata from session:", { company_name, full_name });
  }

  // ⭐ 10: Lag redirect-response ETTER at session er klar
  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  // ⭐ 11: Sett cookies manuelt (Next.js 16 krever dette)
  if (session) {
    const secure = process.env.NODE_ENV === "production"

    response.cookies.set("sb-access-token", session.access_token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
    })

    response.cookies.set("sb-refresh-token", session.refresh_token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
    });
  }

  return response;
}
