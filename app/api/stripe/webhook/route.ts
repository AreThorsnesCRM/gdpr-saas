import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

async function getAccountIdFromCustomer(customerId: string | null) {
  if (!customerId || !supabase) return null;

  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error || !data) return null;
  return data.id;
}

export async function POST(req: Request) {
  if (!stripe) {
    console.error("❌ Stripe not configured");
    return new NextResponse("Stripe not configured", { status: 500 });
  }

  if (!supabase) {
    console.error("❌ Supabase not configured");
    return new NextResponse("Supabase not configured", { status: 500 });
  }

  const body = await req.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  console.log("🔔 Received Stripe event:", event.type);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;

      const accountId = await getAccountIdFromCustomer(customerId);
      if (!accountId) {
        console.log("⚠️ No account found for customer:", customerId);
        break;
      }

      await supabase
        .from("accounts")
        .update({
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
        })
        .eq("id", accountId);

      console.log("✅ checkout.session.completed — account updated:", accountId);
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const accountId = await getAccountIdFromCustomer(customerId);
      if (!accountId) {
        console.log("⚠️ No account found for customer:", customerId);
        break;
      }

      await supabase
        .from("accounts")
        .update({
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
        })
        .eq("id", accountId);

      console.log("✅", event.type, "— account updated:", accountId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const accountId = await getAccountIdFromCustomer(customerId);
      if (!accountId) {
        console.log("⚠️ No account found for customer:", customerId);
        break;
      }

      await supabase
        .from("accounts")
        .update({ subscription_status: "canceled" })
        .eq("id", accountId);

      console.log("✅ customer.subscription.deleted — account updated:", accountId);
      break;
    }

    default:
      console.log("ℹ️ Unhandled event type:", event.type);
  }

  return NextResponse.json({ received: true });
}
