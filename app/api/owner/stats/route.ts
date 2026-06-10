import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "are.thorsnes@gmail.com"

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Kontoer per status
  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("subscription_status, signings_credits_included, signings_credits_purchased, signing_auto_topup")

  const statusCounts: Record<string, number> = {}
  let totalCreditsPurchased = 0
  let totalCreditsUnused = 0
  let autoTopupEnabled = 0

  for (const a of accounts ?? []) {
    const s = a.subscription_status ?? "unknown"
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
    totalCreditsPurchased += a.signings_credits_purchased ?? 0
    totalCreditsUnused += (a.signings_credits_included ?? 0) + (a.signings_credits_purchased ?? 0)
    if (a.signing_auto_topup) autoTopupEnabled++
  }

  const totalAccounts = accounts?.length ?? 0

  // Brukere (profiler)
  const { count: totalUsers } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true })

  // Avtaler per signeringsstatus
  const { data: agreements } = await supabaseAdmin
    .from("agreements")
    .select("signing_status, archived")

  const totalAgreements = agreements?.length ?? 0
  const activeAgreements = agreements?.filter(a => !a.archived).length ?? 0
  const signingPending = agreements?.filter(a => a.signing_status === "pending").length ?? 0
  const signingSigned = agreements?.filter(a => a.signing_status === "signed").length ?? 0

  return NextResponse.json({
    accounts: {
      total: totalAccounts,
      trialing: statusCounts["trialing"] ?? 0,
      active: statusCounts["active"] ?? 0,
      canceled: statusCounts["canceled"] ?? 0,
      past_due: statusCounts["past_due"] ?? 0,
      other: totalAccounts - (statusCounts["trialing"] ?? 0) - (statusCounts["active"] ?? 0) - (statusCounts["canceled"] ?? 0) - (statusCounts["past_due"] ?? 0),
    },
    users: {
      total: totalUsers ?? 0,
    },
    credits: {
      totalPurchased: totalCreditsPurchased,
      totalUnused: totalCreditsUnused,
      autoTopupEnabled,
    },
    agreements: {
      total: totalAgreements,
      active: activeAgreements,
      signingPending,
      signingSigned,
    },
  })
}
