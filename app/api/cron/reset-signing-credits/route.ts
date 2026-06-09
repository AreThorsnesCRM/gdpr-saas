import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const { error, count } = await supabaseAdmin
    .from("accounts")
    .update({ signings_credits_included: 3 })
    .eq("subscription_status", "active")

  if (error) {
    console.error("reset-signing-credits feilet:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`✅ Nullstilte inkluderte signeringskreditter for ${count ?? "??"} kontoer`)
  return NextResponse.json({ ok: true, updated: count })
}
