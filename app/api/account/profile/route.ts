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

  const { data: accountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .single()

  if (!accountUser) return NextResponse.json({ error: "No account found" }, { status: 404 })

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("name, org_number, address, postal_code, city, phone, contact_email")
    .eq("id", accountUser.account_id)
    .single()

  return NextResponse.json(account ?? {})
}

export async function PATCH(req: Request) {
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

  const { data: accountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .single()

  if (!accountUser || accountUser.role !== "admin") {
    return NextResponse.json({ error: "Kun admin kan endre firmainformasjon" }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ["name", "org_number", "address", "postal_code", "city", "phone", "contact_email"]
  const updates: Record<string, string> = {}

  for (const key of allowed) {
    if (typeof body[key] === "string") updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Ingen gyldige felter" }, { status: 400 })
  }

  await supabaseAdmin.from("accounts").update(updates).eq("id", accountUser.account_id)

  return NextResponse.json({ success: true })
}
