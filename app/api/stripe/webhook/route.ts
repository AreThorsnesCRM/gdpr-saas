import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { addCredits } from "@/lib/signing-credits";
import { sendAutoTopupSuccessEmail } from "@/lib/email";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

async function getUserIdFromCustomer(customerId: string | null) {
  if (!customerId) return null;
  const { data } = await supabase!.from("profiles").select("user_id").eq("stripe_customer_id", customerId).single();
  return data?.user_id ?? null;
}

async function getAccountIdFromUserId(userId: string) {
  const { data } = await supabase!.from("account_users").select("account_id").eq("user_id", userId).single();
  return data?.account_id ?? null;
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

  // ✅ Signeringskreditter — håndteres separat, krever ikke user_id
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.type === "signing_credits") {
      const credits = parseInt(session.metadata.credits ?? "0", 10)
      const accountId = session.metadata.account_id
      if (accountId && credits > 0) {
        await addCredits(accountId, credits)
      }
      return NextResponse.json({ received: true });
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.metadata?.type === "signing_credits" && invoice.metadata?.auto_topup === "true") {
      const credits = parseInt(invoice.metadata.credits ?? "0", 10)
      const accountId = invoice.metadata.account_id
      if (accountId && credits > 0) {
        await addCredits(accountId, credits)
        const { data: adminUser } = await supabase!
          .from("account_users")
          .select("user_id")
          .eq("account_id", accountId)
          .eq("role", "admin")
          .single()
        if (adminUser) {
          const { data: profile } = await supabase!
            .from("profiles")
            .select("full_name")
            .eq("user_id", adminUser.user_id)
            .single()
          const { data: authData } = await supabase!.auth.admin.getUserById(adminUser.user_id)
          if (authData?.user?.email) {
            await sendAutoTopupSuccessEmail(authData.user.email, profile?.full_name ?? "")
          }
        }
      }
      return NextResponse.json({ received: true });
    }
  }

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
      const accountId = await getAccountIdFromUserId(userId!);

      await supabase.from("profiles").update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: "active",
      }).eq("user_id", userId!);

      if (accountId) {
        await supabase.from("accounts").update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: "active",
        }).eq("id", accountId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const accountId = await getAccountIdFromUserId(userId);

      await supabase.from("profiles").update({
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
      }).eq("user_id", userId);

      if (accountId) {
        await supabase.from("accounts").update({
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
        }).eq("id", accountId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const accountId = await getAccountIdFromUserId(userId!);

      await supabase.from("profiles").update({ subscription_status: "canceled" }).eq("user_id", userId!);
      if (accountId) {
        await supabase.from("accounts").update({ subscription_status: "canceled" }).eq("id", accountId);
      }
      break;
    }

  }

  return NextResponse.json({ received: true });
}
