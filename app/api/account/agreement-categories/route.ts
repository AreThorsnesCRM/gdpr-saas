import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const PREDEFINED = [
  "Databehandleravtale",
  "Husleieavtale",
  "Samarbeidsavtale",
  "Tjenesteavtale",
  "Konfidensialitetsavtale (NDA)",
  "Arbeidsavtale",
]

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
  return data ?? null
}

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: existing } = await supabaseAdmin
    .from("agreement_categories")
    .select("id, name, is_predefined, position")
    .eq("account_id", accountUser.account_id)
    .order("position", { ascending: true })

  if (!existing || existing.length === 0) {
    const toInsert = PREDEFINED.map((name, i) => ({
      account_id: accountUser.account_id,
      name,
      is_predefined: true,
      position: i + 1,
    }))
    await supabaseAdmin.from("agreement_categories").insert(toInsert)

    const { data: seeded } = await supabaseAdmin
      .from("agreement_categories")
      .select("id, name, is_predefined, position")
      .eq("account_id", accountUser.account_id)
      .order("position", { ascending: true })

    return NextResponse.json({ categories: seeded ?? [] })
  }

  return NextResponse.json({ categories: existing })
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (accountUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from("agreement_categories")
    .select("position")
    .eq("account_id", accountUser.account_id)
    .order("position", { ascending: false })
    .limit(1)

  const maxPosition = existing?.[0]?.position ?? 0

  const { data, error } = await supabaseAdmin
    .from("agreement_categories")
    .insert({
      account_id: accountUser.account_id,
      name: name.trim(),
      is_predefined: false,
      position: maxPosition + 1,
    })
    .select("id, name, is_predefined, position")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}
