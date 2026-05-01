import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  // Les access token fra Authorization header (satt av klienten rett etter SIGNED_IN)
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
  }

  // Verifiser token via Supabase Admin
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user || !user.email) {
    return NextResponse.json({ error: "Ugyldig token" }, { status: 401 })
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
    .select("account_id, restrict_to_own")
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
    restrict_to_own: pendingInvite.restrict_to_own ?? false,
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
