import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Finn account_id for denne brukeren
  const { data: accountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .single()

  if (!accountUser) return NextResponse.json({ error: "No account found" }, { status: 404 })

  // Hent notification preferences for kontoen
  const { data: accountData } = await supabaseAdmin
    .from("accounts")
    .select("notify_trial_ending, notify_payment_failed")
    .eq("id", accountUser.account_id)
    .single()

  // Hent alle brukere i samme account
  const { data: members } = await supabaseAdmin
    .from("account_users")
    .select("user_id, role, restrict_to_own")
    .eq("account_id", accountUser.account_id)

  if (!members) return NextResponse.json({ users: [] })

  // Hent profiler og e-poster
  const userIds = members.map((m) => m.user_id)

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds)

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()

  const users = members.map((member) => {
    const profile = profiles?.find((p) => p.user_id === member.user_id)
    const authUser = authUsers?.users?.find((u) => u.id === member.user_id)
    return {
      user_id: member.user_id,
      full_name: profile?.full_name ?? "—",
      email: authUser?.email ?? "—",
      role: member.role,
      restrict_to_own: member.restrict_to_own ?? false,
    }
  })

  // Hent ventende invitasjoner
  const { data: pending } = await supabaseAdmin
    .from("pending_invites")
    .select("email, restrict_to_own")
    .eq("account_id", accountUser.account_id)

  return NextResponse.json({
    users,
    pendingInvites: pending ?? [],
    currentUserRole: accountUser.role,
    notify_trial_ending: accountData?.notify_trial_ending ?? true,
    notify_payment_failed: accountData?.notify_payment_failed ?? true,
  })
}
