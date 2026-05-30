import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // 1. Hent bruker
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Hent profil
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      console.error("[checkout] Profile not found for user:", user.id);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let stripeCustomerId = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      console.log("[checkout] No stripe_customer_id for user:", user.id, "— creating on the fly");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;

      if (supabaseAdmin) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        const trialData = {
          stripe_customer_id: customer.id,
          subscription_status: "trialing",
          trial_start: new Date().toISOString(),
          trial_end: trialEnd.toISOString(),
        };
        await supabaseAdmin.from("profiles").update(trialData).eq("user_id", user.id);
        if (profile.account_id) {
          await supabaseAdmin.from("accounts").update({
            trial_start: trialData.trial_start,
            trial_end: trialData.trial_end,
          }).eq("id", profile.account_id);
        }
      }
    }

    // 3. Hent landkode for å velge riktig valuta
    let country: string | null = null
    if (supabaseAdmin && profile.account_id) {
      const { data: account } = await supabaseAdmin
        .from("accounts")
        .select("country")
        .eq("id", profile.account_id)
        .single()
      country = account?.country ?? null
    }

    const priceId = country === "NO"
      ? process.env.STRIPE_PRICE_ID!
      : (process.env.STRIPE_PRICE_ID_USD || process.env.STRIPE_PRICE_ID!)

    // 4. Base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

    // 5. Lag checkout-session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout] Unexpected error:", error);
    return NextResponse.json({ error: "Stripe session error" }, { status: 500 });
  }
}
