export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");

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
    if (email) {
      await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });
    }
  }

  // ⭐ 4: Hent bruker etter session er satt
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ⭐ 5: Hent metadata fra auth.users
  const { data: authUser } = await supabaseAdmin
    .from("auth.users")
    .select("raw_user_meta_data")
    .eq("id", user.id)
    .single();

  const company_name = authUser?.raw_user_meta_data?.company_name ?? null;
  const full_name = authUser?.raw_user_meta_data?.full_name ?? null;

  // ⭐ 6: Sjekk om profil finnes
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let profile = existingProfile;

  // ⭐ 7: Opprett profil + Stripe-kunde hvis ny bruker
  if (!existingProfile) {
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

  // ⭐ 10: Lag redirect-response ETTER at session er klar
  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  // ⭐ 11: Sett cookies manuelt (Next.js 16 krever dette)
  if (session) {
    response.cookies.set("sb-access-token", session.access_token, {
      path: "/",
      httpOnly: true,
    });

    response.cookies.set("sb-refresh-token", session.refresh_token, {
      path: "/",
      httpOnly: true,
    });
  }

  return response;
}
