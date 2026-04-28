export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function GET(request: NextRequest) {
  if (!stripe) {
    console.error("[callback] Stripe not configured");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!supabaseAdmin) {
    console.error("[callback] Supabase admin not configured");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");

  const queryCompanyName = url.searchParams.get("company_name");
  const queryFullName = url.searchParams.get("full_name");
  const inviteAccountId = url.searchParams.get("account_id"); // satt ved bruker-invitasjon

  // Opprett supabase-klient for auth-operasjoner
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  // Bytt kode eller verifiser OTP
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (token && type === "signup") {
    const email = url.searchParams.get("email");
    const verifyPayload: any = { token, type: "signup" };
    if (email) verifyPayload.email = email;
    const { error } = await supabase.auth.verifyOtp(verifyPayload);
    if (error) console.error("[callback] verifyOtp error:", error);
  }

  // Hent bruker
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("[callback] No user after auth exchange");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Hent metadata — user_metadata er mest pålitelig, query params som backup
  const company_name =
    user.user_metadata?.company_name ?? queryCompanyName ?? "Mitt firma";
  const full_name =
    user.user_metadata?.full_name ?? queryFullName ?? user.email?.split("@")[0] ?? "Bruker";

  console.log("[callback] user:", user.id, "company:", company_name, "name:", full_name);

  // Sjekk om bruker allerede har en konto
  const { data: existingAccountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let accountId = existingAccountUser?.account_id ?? null;

  // Invitert bruker — koble til eksisterende firma
  if (!accountId && inviteAccountId) {
    await supabaseAdmin.from("account_users").insert({
      account_id: inviteAccountId,
      user_id: user.id,
      role: "member",
    });
    accountId = inviteAccountId;
  }

  if (!accountId) {
    // Ny bruker — opprett firma, koble bruker, opprett Stripe-kunde
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const customer = await stripe.customers.create({
      email: user.email,
      name: company_name,
      metadata: { user_id: user.id },
    });

    const { data: newAccount, error: accountError } = await supabaseAdmin
      .from("accounts")
      .insert({
        name: company_name,
        stripe_customer_id: customer.id,
        subscription_status: "trialing",
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
      })
      .select()
      .single();

    if (accountError || !newAccount) {
      console.error("[callback] Failed to create account:", accountError);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    accountId = newAccount.id;

    await supabaseAdmin.from("account_users").insert({
      account_id: accountId,
      user_id: user.id,
      role: "admin",
    });
  }

  // Opprett eller oppdater profil
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfile) {
    await supabaseAdmin
      .from("profiles")
      .update({ account_id: accountId, full_name })
      .eq("user_id", user.id);
  } else {
    await supabaseAdmin.from("profiles").insert({
      user_id: user.id,
      account_id: accountId,
      full_name,
    });
  }

  // Oppdater JWT med subscription-info for middleware
  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("subscription_status, trial_end")
    .eq("id", accountId)
    .single();

  if (account) {
    await supabase.auth.updateUser({
      data: {
        subscription_status: account.subscription_status,
        trial_end: account.trial_end,
      },
    });
  }

  // Hent session for cookies
  const { data: { session } } = await supabase.auth.getSession();

  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  if (session) {
    const secure = process.env.NODE_ENV === "production";

    response.cookies.set("sb-access-token", session.access_token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
    });

    response.cookies.set("sb-refresh-token", session.refresh_token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
    });

    response.cookies.set("temp_session", JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
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
