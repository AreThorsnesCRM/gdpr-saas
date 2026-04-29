import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"

export async function POST() {
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
  if (!user || !user.email) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
  }

  // Bruker har allerede en konto — send til dashboard
  const { data: existingAccountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existingAccountUser) {
    return NextResponse.json({ redirect: "/dashboard" })
  }

  // Finn invitasjonen
  const { data: pendingInvite } = await supabaseAdmin
    .from("pending_invites")
    .select("account_id")
    .eq("email", user.email)
    .maybeSingle()

  if (!pendingInvite) {
    console.error("[accept-invite] No pending invite for:", user.email)
    return NextResponse.json({ error: "Ingen aktiv invitasjon funnet for denne e-postadressen." }, { status: 404 })
  }

  // Koble bruker til firmakonto
  await supabaseAdmin.from("account_users").insert({
    account_id: pendingInvite.account_id,
    user_id: user.id,
    role: "member",
  })

  // Opprett profil
  const full_name = user.user_metadata?.full_name ?? user.email.split("@")[0]
  await supabaseAdmin.from("profiles").upsert({
    user_id: user.id,
    account_id: pendingInvite.account_id,
    full_name,
  }, { onConflict: "user_id" })

  // Slett brukt invitasjon
  await supabaseAdmin.from("pending_invites").delete().eq("email", user.email)

  console.log("[accept-invite] User linked:", user.email, "→ account:", pendingInvite.account_id)
  return NextResponse.json({ redirect: "/set-password" })
}
