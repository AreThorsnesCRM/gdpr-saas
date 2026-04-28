import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { sendTrialEndingEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  // Beskytt cron-endepunktet mot uautorisert tilgang
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  const now = new Date()
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const in1day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

  // Finn kontoer i prøveperiode som utløper om 3 eller 1 dag
  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("id, name, trial_end, notify_trial_ending")
    .eq("subscription_status", "trialing")
    .eq("notify_trial_ending", true)

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0

  for (const account of accounts) {
    if (!account.trial_end) continue

    const trialEnd = new Date(account.trial_end)
    const diffMs = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays !== 3 && diffDays !== 1) continue

    // Hent admin-bruker for denne kontoen
    const { data: adminUser } = await supabaseAdmin
      .from("account_users")
      .select("user_id")
      .eq("account_id", account.id)
      .eq("role", "admin")
      .single()

    if (!adminUser) continue

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(adminUser.user_id)
    if (!authUser?.user?.email) continue

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", adminUser.user_id)
      .single()

    const name = profile?.full_name ?? authUser.user.email.split("@")[0]

    await sendTrialEndingEmail(authUser.user.email, name, diffDays)
    sent++
    console.log(`[trial-check] Sent ${diffDays}-day warning to ${authUser.user.email}`)
  }

  return NextResponse.json({ sent })
}
