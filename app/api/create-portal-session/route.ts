import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: userData } = await supabase.auth.getUser()

  if (!userData?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("user_id", userData.user.id)
    .single()

  if (!profile?.account_id) {
    return NextResponse.json({ error: "Profile or account not found" }, { status: 400 })
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", profile.account_id)
    .single()

  if (!account?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer ID" }, { status: 400 })
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`

  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: returnUrl,
  })

  return NextResponse.json({ url: session.url })
}
