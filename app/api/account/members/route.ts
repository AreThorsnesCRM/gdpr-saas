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

  if (!accountUser) return NextResponse.json({ members: [] })

  const { data: members } = await supabaseAdmin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountUser.account_id)

  if (!members || members.length === 0) return NextResponse.json({ members: [] })

  const userIds = members.map((m) => m.user_id)

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds)

  return NextResponse.json({ members: profiles ?? [] })
}
