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

  const { data: acceptance } = await supabaseAdmin
    .from("dpa_acceptances")
    .select("dpa_version, accepted_at")
    .eq("account_id", accountUser.account_id)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    version: acceptance?.dpa_version ?? null,
    acceptedAt: acceptance?.accepted_at ?? null,
  })
}
