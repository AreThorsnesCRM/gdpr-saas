import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  // Les access token fra Authorization-header (satt av AuthProvider)
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: "Ugyldig token" }, { status: 401 })

  const { data } = await supabaseAdmin
    .from("account_users")
    .select("role, restrict_to_own")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json({
    role: data?.role ?? null,
    restrict_to_own: data?.restrict_to_own ?? false,
  })
}
