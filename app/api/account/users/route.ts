import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"

async function getCallerAccountUser(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: accountUser } = await supabaseAdmin!
    .from("account_users")
    .select("account_id, role, user_id")
    .eq("user_id", user.id)
    .single()
  return accountUser ?? null
}

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  const cookieStore = await cookies()
  const accountUser = await getCallerAccountUser(cookieStore)
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

// Fjern bruker fra kontoen
export async function DELETE(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const cookieStore = await cookies()
  const caller = await getCallerAccountUser(cookieStore)
  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "Kun admin kan fjerne brukere" }, { status: 403 })
  }

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: "user_id mangler" }, { status: 400 })
  if (user_id === caller.user_id) {
    return NextResponse.json({ error: "Du kan ikke fjerne deg selv" }, { status: 400 })
  }

  // Sjekk at brukeren tilhører samme konto og ikke er admin
  const { data: target } = await supabaseAdmin
    .from("account_users")
    .select("role")
    .eq("user_id", user_id)
    .eq("account_id", caller.account_id)
    .single()

  if (!target) return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 })
  if (target.role === "admin") {
    return NextResponse.json({ error: "Kan ikke fjerne en admin" }, { status: 400 })
  }

  await supabaseAdmin.from("account_users").delete().eq("user_id", user_id).eq("account_id", caller.account_id)
  await supabaseAdmin.from("profiles").update({ account_id: null }).eq("user_id", user_id)

  return NextResponse.json({ success: true })
}

// Overfør admin-rollen eller oppdater tilgangsnivå
export async function PATCH(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const cookieStore = await cookies()
  const caller = await getCallerAccountUser(cookieStore)
  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "Kun admin kan endre brukerinnstillinger" }, { status: 403 })
  }

  const body = await req.json()
  const { user_id } = body
  if (!user_id) return NextResponse.json({ error: "user_id mangler" }, { status: 400 })

  // Sjekk at brukeren tilhører samme konto
  const { data: target } = await supabaseAdmin
    .from("account_users")
    .select("role")
    .eq("user_id", user_id)
    .eq("account_id", caller.account_id)
    .single()

  if (!target) return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 })

  // Oppdater tilgang (restrict_to_own) — skriv til begge tabeller
  if (typeof body.restrict_to_own === "boolean") {
    await Promise.all([
      supabaseAdmin
        .from("account_users")
        .update({ restrict_to_own: body.restrict_to_own })
        .eq("user_id", user_id)
        .eq("account_id", caller.account_id),
      supabaseAdmin
        .from("profiles")
        .update({ restrict_to_own: body.restrict_to_own })
        .eq("user_id", user_id),
    ])
    return NextResponse.json({ success: true })
  }

  // Overfør admin-rollen
  if (body.action === "make_admin") {
    if (user_id === caller.user_id) {
      return NextResponse.json({ error: "Du er allerede admin" }, { status: 400 })
    }
    await supabaseAdmin.from("account_users").update({ role: "admin" }).eq("user_id", user_id).eq("account_id", caller.account_id)
    await supabaseAdmin.from("account_users").update({ role: "member" }).eq("user_id", caller.user_id).eq("account_id", caller.account_id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Ukjent handling" }, { status: 400 })
}
