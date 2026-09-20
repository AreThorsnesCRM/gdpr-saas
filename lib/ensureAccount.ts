import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

const TRIAL_DAYS = 7
const DUPLICATE_KEY = "23505"

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

async function findAccountId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin!
    .from("account_users")
    .select("account_id")
    .eq("user_id", userId)
    .maybeSingle()
  return data?.account_id ?? null
}

// Safety net for /callback silently failing to create the account after email
// confirmation: gives a logged-in user who registered via /register (and has no
// account) their own account with the admin role. Never touches invited users — they
// have no company_name metadata and/or a pending invite — because accept-invite must
// be the one to attach them to the inviter's account.
//
// The account id is the user's own id, so two concurrent calls (page load + tab focus
// refresh) collide on the primary key instead of creating two accounts.
export async function ensureAccountForUser(user: AuthUser): Promise<string | null> {
  if (!supabaseAdmin) return null
  const db = supabaseAdmin

  const existing = await findAccountId(user.id)
  if (existing) return existing

  const meta = user.user_metadata ?? {}
  const companyName = typeof meta.company_name === "string" ? meta.company_name.trim() : ""
  if (!companyName) return null

  if (user.email) {
    const { data: invite } = await db
      .from("pending_invites")
      .select("email")
      .eq("email", user.email)
      .maybeSingle()
    if (invite) return null
  }

  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    user.email?.split("@")[0] ||
    "Bruker"

  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id, trial_start, trial_end")
    .eq("user_id", user.id)
    .maybeSingle()

  const now = new Date()
  const trialStart = profile?.trial_start ?? now.toISOString()
  const trialEnd = profile?.trial_end ?? new Date(now.getTime() + TRIAL_DAYS * 86400000).toISOString()

  const { error: accountError } = await db.from("accounts").insert({
    id: user.id,
    name: companyName,
    subscription_status: "trialing",
    trial_start: trialStart,
    trial_end: trialEnd,
  })

  let weCreatedAccount = !accountError
  if (accountError) {
    if (accountError.code !== DUPLICATE_KEY) {
      console.error("[ensureAccount] accounts insert error:", accountError)
      return null
    }
    // Another request is provisioning this user right now — give it a moment to finish.
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 400))
      const found = await findAccountId(user.id)
      if (found) return found
    }
    // The account exists but nobody attached the user (earlier attempt died midway).
    weCreatedAccount = true
  }

  if (!weCreatedAccount) return null

  let stripeCustomerId = profile?.stripe_customer_id ?? null
  if (!stripeCustomerId && stripe && user.email) {
    try {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })
      stripeCustomerId = customer.id
    } catch (err) {
      console.error("[ensureAccount] stripe customer create error:", err)
    }
  }
  if (stripeCustomerId) {
    await db.from("accounts").update({ stripe_customer_id: stripeCustomerId }).eq("id", user.id)
  }

  const { error: memberError } = await db
    .from("account_users")
    .insert({ account_id: user.id, user_id: user.id, role: "admin" })
  if (memberError) {
    console.error("[ensureAccount] account_users insert error:", memberError)
    return null
  }

  await db.from("profiles").upsert(
    {
      user_id: user.id,
      company_name: companyName,
      full_name: fullName,
      stripe_customer_id: stripeCustomerId,
      subscription_status: "trialing",
      trial_start: trialStart,
      trial_end: trialEnd,
      account_id: user.id,
    },
    { onConflict: "user_id" }
  )

  await db.from("dpa_acceptances").update({ account_id: user.id }).eq("user_id", user.id).is("account_id", null)

  console.log("[ensureAccount] provisioned account for", user.email)
  return user.id
}
