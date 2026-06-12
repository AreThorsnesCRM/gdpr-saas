import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { SIGNING_PACKAGES } from "@/lib/signing-credits"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

export async function POST(req: Request) {
  if (!stripe || !supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const { credits, currency } = await req.json()
  const pkg = SIGNING_PACKAGES.find(p => p.credits === credits)
  if (!pkg) return NextResponse.json({ error: "Ugyldig pakke" }, { status: 400 })
  const isEur = currency === "eur"

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: accountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .single()
  if (!accountUser) return NextResponse.json({ error: "No account" }, { status: 403 })
  if (accountUser.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("subscription_status, stripe_customer_id")
    .eq("id", accountUser.account_id)
    .single()

  if (!account || account.subscription_status !== "active") {
    return NextResponse.json({ error: "Aktivt abonnement kreves" }, { status: 403 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  const priceKey = isEur ? `STRIPE_SIGNING_PRICE_EUR_${pkg.credits}` : `STRIPE_SIGNING_PRICE_${pkg.credits}`
  const priceId = process.env[priceKey]
  if (!priceId) return NextResponse.json({ error: "Pris ikke konfigurert" }, { status: 500 })

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: account.stripe_customer_id ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/settings?tab=abonnement&credits=purchased`,
    cancel_url: `${baseUrl}/settings?tab=abonnement`,
    metadata: {
      type: "signing_credits",
      credits: String(pkg.credits),
      account_id: accountUser.account_id,
    },
  })

  return NextResponse.json({ url: session.url })
}
