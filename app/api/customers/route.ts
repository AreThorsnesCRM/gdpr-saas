import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: "Ugyldig token" }, { status: 401 })

  // Hent account_id fra account_users — pålitelig via supabaseAdmin
  const { data: accountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .single()

  if (!accountUser) return NextResponse.json({ error: "Ingen konto funnet" }, { status: 403 })

  const body = await req.json()

  const { data, error } = await supabaseAdmin.from("customers").insert([{
    user_id: user.id,
    account_id: accountUser.account_id,
    name: body.name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    org_nummer: body.org_nummer ?? null,
    address: body.address ?? null,
    postal_code: body.postal_code ?? null,
    city: body.city ?? null,
    account_manager_id: body.account_manager_id ?? null,
  }]).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id })
}
