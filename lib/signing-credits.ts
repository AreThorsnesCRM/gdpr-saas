import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

export const METHOD_CREDITS: Record<string, number> = {
  "otp-email-non-qualified": 1,
  "veriff-advanced-signature": 2,
  "evrotrust-signature": 3,
  "itsme-qes-signature": 3,
}

export const SIGNING_PACKAGES = [
  { credits: 5,  amount: 17500, label: "5 signeringskreditter" },
  { credits: 10, amount: 31900, label: "10 signeringskreditter" },
  { credits: 20, amount: 57900, label: "20 signeringskreditter" },
] as const

export type SigningPackage = (typeof SIGNING_PACKAGES)[number]

export function getMethodCost(method: string): number {
  return METHOD_CREDITS[method] ?? 1
}

export async function addCredits(accountId: string, credits: number): Promise<void> {
  if (!supabaseAdmin) return
  const { data } = await supabaseAdmin
    .from("accounts")
    .select("signings_credits_purchased")
    .eq("id", accountId)
    .single()
  await supabaseAdmin
    .from("accounts")
    .update({ signings_credits_purchased: (data?.signings_credits_purchased ?? 0) + credits })
    .eq("id", accountId)
}

export async function deductCredits(
  accountId: string,
  cost: number
): Promise<{ ok: boolean; remaining: number }> {
  if (!supabaseAdmin) return { ok: false, remaining: 0 }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("signings_credits_included, signings_credits_purchased")
    .eq("id", accountId)
    .single()

  if (!account) return { ok: false, remaining: 0 }

  let included = account.signings_credits_included ?? 0
  let purchased = account.signings_credits_purchased ?? 0
  const total = included + purchased

  if (total < cost) return { ok: false, remaining: total }

  // Trekk fra inkluderte kreditter først, deretter kjøpte
  let toPay = cost
  if (included >= toPay) {
    included -= toPay
    toPay = 0
  } else {
    toPay -= included
    included = 0
    purchased -= toPay
  }

  await supabaseAdmin
    .from("accounts")
    .update({ signings_credits_included: included, signings_credits_purchased: purchased })
    .eq("id", accountId)

  return { ok: true, remaining: included + purchased }
}

export async function triggerAutoTopup(
  accountId: string,
  adminEmail: string,
  adminName: string
): Promise<void> {
  if (!stripe || !supabaseAdmin) return

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", accountId)
    .single()

  if (!account?.stripe_customer_id) return

  try {
    const customer = await stripe.customers.retrieve(account.stripe_customer_id) as Stripe.Customer
    if (customer.deleted) return

    const paymentMethodId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : null

    if (!paymentMethodId) {
      const { sendAutoTopupFailedEmail } = await import("@/lib/email")
      await sendAutoTopupFailedEmail(adminEmail, adminName)
      return
    }

    await stripe.paymentIntents.create({
      amount: 57900,
      currency: "nok",
      customer: account.stripe_customer_id,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        type: "signing_credits",
        credits: "20",
        account_id: accountId,
        auto_topup: "true",
      },
      description: "Pactiva — auto-topup 20 signeringskreditter",
    })
    // Kreditter legges til via webhook (payment_intent.succeeded)
  } catch (err: any) {
    console.error("Auto-topup feilet:", err?.message)
    const { sendAutoTopupFailedEmail } = await import("@/lib/email")
    await sendAutoTopupFailedEmail(adminEmail, adminName)
  }
}
