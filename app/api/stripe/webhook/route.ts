import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);


// Supabase server client (service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // Hent user_id fra metadata (kun for checkout.session.completed)
let userId: string | null = null;

if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;
  userId = session.metadata?.user_id ?? null;
}

console.log("👤 User ID from metadata:", userId);

// Hvis vi ikke har userId, kan vi ikke oppdatere Supabase
if (!userId) {
  console.log("⚠️ No user_id in metadata, skipping Supabase update.");
  return NextResponse.json({ received: true });
}


  // Håndter relevante Stripe events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      console.log("💳 Checkout completed for user:", userId);

      await supabase
        .from("profiles")
        .update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
        })
        .eq("user_id", userId);

      console.log("✅ Supabase updated after checkout.session.completed");
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object;

      console.log("🔄 Subscription updated:", subscription.status);

      await supabase
        .from("profiles")
        .update({
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
        })
        .eq("user_id", userId);

      console.log("✅ Supabase updated after subscription event");
      break;
    }

    case "customer.subscription.deleted": {
      console.log("❌ Subscription canceled for user:", userId);

      await supabase
        .from("profiles")
        .update({
          subscription_status: "canceled",
        })
        .eq("user_id", userId);

      console.log("🛑 User subscription marked as canceled");
      break;
    }

    default:
      console.log("ℹ️ Event not handled:", event.type);
  }

  return NextResponse.json({ received: true });
}
