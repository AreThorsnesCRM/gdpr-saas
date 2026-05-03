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
  return data ?? null
}

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabaseAdmin
    .from("agreement_templates")
    .select("id, name, duration_months, content, created_at")
    .eq("account_id", accountUser.account_id)
    .order("created_at", { ascending: false })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, duration_months, content } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("agreement_templates")
    .insert({
      account_id: accountUser.account_id,
      name: name.trim(),
      duration_months: duration_months ?? 12,
      content: content ?? "",
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
