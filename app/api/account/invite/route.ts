import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "E-post mangler" }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Sjekk at brukeren er admin
  const { data: accountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .single()

  if (!accountUser || accountUser.role !== "admin") {
    return NextResponse.json({ error: "Kun admin kan invitere brukere" }, { status: 403 })
  }

  // Sjekk at e-posten ikke allerede er i kontoen
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = authUsers?.users?.find((u) => u.email === email)

  if (existingUser) {
    const { data: alreadyMember } = await supabaseAdmin
      .from("account_users")
      .select("id")
      .eq("account_id", accountUser.account_id)
      .eq("user_id", existingUser.id)
      .maybeSingle()

    if (alreadyMember) {
      return NextResponse.json({ error: "Brukeren er allerede på denne kontoen" }, { status: 400 })
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  const redirectTo = `${baseUrl}/callback?account_id=${accountUser.account_id}`

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo })

  if (error) {
    console.error("[invite] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
