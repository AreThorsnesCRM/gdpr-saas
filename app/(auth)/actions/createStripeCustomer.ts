"use server";

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createStripeCustomer(userId: string, email: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Opprett Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  // 2. Sett trialing-status og trial_end
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);

  // 3. Oppdater Supabase-profilen
  await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customer.id,
      subscription_status: "trialing",
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
    })
    .eq("user_id", userId);

  return customer.id;
}
