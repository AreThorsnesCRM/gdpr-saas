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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const { data } = await supabaseAdmin
    .from("agreement_templates")
    .select("*")
    .eq("id", id)
    .eq("account_id", accountUser.account_id)
    .single()

  if (!data) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 })
  return NextResponse.json({ template: data })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const { name, duration_months, content } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 })

  const { error } = await supabaseAdmin
    .from("agreement_templates")
    .update({ name: name.trim(), duration_months, content })
    .eq("id", id)
    .eq("account_id", accountUser.account_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  await supabaseAdmin
    .from("agreement_templates")
    .delete()
    .eq("id", id)
    .eq("account_id", accountUser.account_id)

  return NextResponse.json({ success: true })
}
