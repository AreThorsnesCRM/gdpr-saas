import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🔍 Hjelpefunksjon: Finn user_id basert på stripe_customer_id
async function getUserIdFromCustomer(customerId: string | null) {
  if (!customerId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error || !data) return null;
  return data.user_id;
}

export async function POST(req: Request) {
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

  let userId: string | null = null;

  // 1️⃣ checkout.session.completed → metadata har user_id
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    userId = session.metadata?.user_id ?? null;
  }

  // 2️⃣ subscription events → finn user_id via stripe_customer_id
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    userId = await getUserIdFromCustomer(customerId);
  }

  console.log("👤 Resolved user ID:", userId);

  if (!userId) {
    console.log("⚠️ No user_id found. Skipping Supabase update.");
    return NextResponse.json({ received: true });
  }

  // 🔄 Håndter eventene
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      await supabase
        .from("profiles")
        .update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
        })
        .eq("user_id", userId);

      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from("profiles")
        .update({
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
        })
        .eq("user_id", userId);

      break;
    }

    case "customer.subscription.deleted": {
      await supabase
        .from("profiles")
        .update({
          subscription_status: "canceled",
        })
        .eq("user_id", userId);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
