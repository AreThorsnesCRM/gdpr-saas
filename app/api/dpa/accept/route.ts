import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { DPA_VERSION } from "@/lib/dpa"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Called right after supabase.auth.signUp() succeeds on /register, before the user
// has confirmed their email (no session exists yet — see app/(auth)/callback/route.ts
// for why account_id isn't known until then). The version is always the server's own
// DPA_VERSION, never taken from the client, so a stale page can't record acceptance of
// the wrong version.
export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const { user_id } = await req.json()
  if (typeof user_id !== "string" || !UUID_RE.test(user_id)) {
    return NextResponse.json({ error: "invalid_user_id" }, { status: 400 })
  }

  const ip_address =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  const user_agent = req.headers.get("user-agent")

  const { error } = await supabaseAdmin.from("dpa_acceptances").insert({
    user_id,
    dpa_version: DPA_VERSION,
    ip_address,
    user_agent,
  })

  if (error) {
    console.error("[dpa/accept] insert error:", error.message)
    return NextResponse.json({ error: "insert_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
