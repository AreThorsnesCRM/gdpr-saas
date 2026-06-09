import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

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
    .select("account_id, role, restrict_to_own")
    .eq("user_id", user.id)
    .single()

  if (!accountUser) return NextResponse.json({ error: "No account" }, { status: 404 })

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, name, country, subscription_status, trial_start, trial_end, stripe_customer_id, stripe_subscription_id, ai_assistant_enabled, ai_dashboard_widget_enabled, signing_method, signings_credits_included, signings_credits_purchased")
    .eq("id", accountUser.account_id)
    .single()

  return NextResponse.json({
    account,
    role: accountUser.role,
    restrict_to_own: accountUser.restrict_to_own ?? false,
  })
}
