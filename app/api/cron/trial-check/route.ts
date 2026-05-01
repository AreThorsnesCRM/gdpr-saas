import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  sendTrialEndingEmail,
  sendExpiringAgreementEmail,
  sendAgreementExpiredEmail,
} from "@/lib/email"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  const now = new Date()
  const todayStr = toDateStr(now)
  const yesterdayStr = toDateStr(new Date(now.getTime() - 86400000))
  const in7Str = toDateStr(new Date(now.getTime() + 7 * 86400000))
  const in14Str = toDateStr(new Date(now.getTime() + 14 * 86400000))

  let sent = 0

  // ── 1. Prøveperiode-varsler ───────────────────────────────────────────────
  const { data: trialingAccounts } = await supabaseAdmin
    .from("accounts")
    .select("id, trial_end, notify_trial_ending")
    .eq("subscription_status", "trialing")
    .eq("notify_trial_ending", true)

  for (const account of trialingAccounts ?? []) {
    if (!account.trial_end) continue
    const diffDays = Math.ceil(
      (new Date(account.trial_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays !== 14 && diffDays !== 7) continue

    const recipient = await getAdminEmail(account.id)
    if (!recipient) continue

    await sendTrialEndingEmail(recipient.email, recipient.name, diffDays)
    sent++
    console.log(`[cron] Trial warning (${diffDays}d) → ${recipient.email}`)
  }

  // ── 2. Utløpende avtaler (7 og 14 dager) ─────────────────────────────────
  const { data: expiringAgreements } = await supabaseAdmin
    .from("agreements")
    .select("id, title, end_date, customers(id, name, account_id, account_manager_id)")
    .in("end_date", [in7Str, in14Str])
    .eq("archived", false)

  for (const agreement of expiringAgreements ?? []) {
    const customer = Array.isArray(agreement.customers)
      ? agreement.customers[0]
      : agreement.customers
    if (!customer) continue

    const daysLeft = Math.ceil(
      (new Date(agreement.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    const recipient = await getRecipient(
      customer.account_manager_id,
      customer.account_id,
      "notify_expiring_agreements"
    )
    if (!recipient) continue

    await sendExpiringAgreementEmail(
      recipient.email, recipient.name, customer.name, agreement.title, daysLeft
    )
    sent++
    console.log(`[cron] Expiring agreement (${daysLeft}d) → ${recipient.email}`)
  }

  // ── 3. Kunder uten aktiv avtale (avtale utløp i går) ─────────────────────
  const { data: expiredAgreements } = await supabaseAdmin
    .from("agreements")
    .select("id, title, customers(id, name, account_id, account_manager_id)")
    .eq("end_date", yesterdayStr)
    .eq("archived", false)

  for (const agreement of expiredAgreements ?? []) {
    const customer = Array.isArray(agreement.customers)
      ? agreement.customers[0]
      : agreement.customers
    if (!customer) continue

    // Skip if customer still has other active agreements
    const { data: active } = await supabaseAdmin
      .from("agreements")
      .select("id")
      .eq("customer_id", customer.id)
      .eq("archived", false)
      .or(`end_date.is.null,end_date.gte.${todayStr}`)
      .neq("id", agreement.id)
      .limit(1)

    if (active && active.length > 0) continue

    const recipient = await getRecipient(
      customer.account_manager_id,
      customer.account_id,
      "notify_no_active_agreement"
    )
    if (!recipient) continue

    await sendAgreementExpiredEmail(
      recipient.email, recipient.name, customer.name, agreement.title
    )
    sent++
    console.log(`[cron] No active agreement → ${recipient.email}`)
  }

  return NextResponse.json({ sent })
}

// ── Hjelpere ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0]
}

async function getRecipient(
  managerId: string | null,
  accountId: string,
  prefKey: "notify_expiring_agreements" | "notify_no_active_agreement"
): Promise<{ email: string; name: string } | null> {
  if (!supabaseAdmin) return null

  if (managerId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, notify_expiring_agreements, notify_no_active_agreement")
      .eq("user_id", managerId)
      .single()

    const prefs = profile as Record<string, unknown> | null
    const wantsNotif = prefs != null ? ((prefs[prefKey] ?? true) as boolean) : true

    if (wantsNotif) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(managerId)
      if (authUser?.user?.email) {
        return {
          email: authUser.user.email,
          name: (profile as { full_name?: string } | null)?.full_name
            ?? authUser.user.email.split("@")[0],
        }
      }
    }
  }

  // Fallback: account admin
  const { data: adminUser } = await supabaseAdmin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("role", "admin")
    .single()

  if (!adminUser) return null
  if (managerId && adminUser.user_id === managerId) return null

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, notify_expiring_agreements, notify_no_active_agreement")
    .eq("user_id", adminUser.user_id)
    .single()

  const adminPrefs = adminProfile as Record<string, unknown> | null
  const adminWantsNotif = adminPrefs != null ? ((adminPrefs[prefKey] ?? true) as boolean) : true
  if (!adminWantsNotif) return null

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(adminUser.user_id)
  if (!authUser?.user?.email) return null

  return {
    email: authUser.user.email,
    name: (adminProfile as { full_name?: string } | null)?.full_name
      ?? authUser.user.email.split("@")[0],
  }
}

async function getAdminEmail(accountId: string): Promise<{ email: string; name: string } | null> {
  if (!supabaseAdmin) return null

  const { data: adminUser } = await supabaseAdmin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("role", "admin")
    .single()

  if (!adminUser) return null

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("user_id", adminUser.user_id)
    .single()

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(adminUser.user_id)
  if (!authUser?.user?.email) return null

  return {
    email: authUser.user.email,
    name: (profile as { full_name?: string } | null)?.full_name
      ?? authUser.user.email.split("@")[0],
  }
}
