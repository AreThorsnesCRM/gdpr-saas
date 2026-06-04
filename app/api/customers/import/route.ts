import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

async function getAccountUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin!
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .single()
  return data ? { ...data, user_id: user.id } : null
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { customers } = await req.json()
  if (!Array.isArray(customers) || customers.length === 0) {
    return NextResponse.json({ error: "Ingen kunder å importere" }, { status: 400 })
  }

  const rows = customers.map((c: any) => ({
    account_id: accountUser.account_id,
    user_id: accountUser.user_id,
    name: c.name?.trim() ?? "",
    email: c.email?.trim() || null,
    phone: c.phone?.trim() || null,
    org_nummer: c.org_nummer?.trim() || null,
    address: c.address?.trim() || null,
    postal_code: c.postal_code?.trim() || null,
    city: c.city?.trim() || null,
    website: c.website?.trim() || null,
    country: c.country?.trim() || null,
  })).filter((c) => c.name)

  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert(rows)
    .select("id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: data?.length ?? 0 })
}
