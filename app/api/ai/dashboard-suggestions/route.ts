import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 500 })

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
  if (!accountUser) return NextResponse.json({ error: "No account" }, { status: 403 })

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("ai_assistant_enabled, ai_dashboard_widget_enabled")
    .eq("id", accountUser.account_id)
    .single()

  if (!account?.ai_assistant_enabled || !account?.ai_dashboard_widget_enabled) {
    return NextResponse.json({ error: "Widget not enabled" }, { status: 403 })
  }

  const today = new Date().toISOString().split("T")[0]
  const in30Days = new Date()
  in30Days.setDate(in30Days.getDate() + 30)
  const in30DaysStr = in30Days.toISOString().split("T")[0]

  const [
    { data: customers },
    { data: expiring },
    { data: recentNotes },
  ] = await Promise.all([
    supabase.from("customers").select("id, name, last_activity_at"),
    supabase.from("agreements").select("title, end_date, customer_id").eq("archived", false)
      .gte("end_date", today).lte("end_date", in30DaysStr).order("end_date", { ascending: true }).limit(5),
    supabase.from("notes").select("content, created_at, customer_id").order("created_at", { ascending: false }).limit(20),
  ])

  const { data: allAgreements } = await supabase.from("agreements").select("customer_id, archived")

  const customersWithActive = new Set(
    allAgreements?.filter((a: any) => !a.archived).map((a: any) => a.customer_id) ?? []
  )
  const noActiveAgreement = customers?.filter((c: any) => !customersWithActive.has(c.id)) ?? []

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const notContactedRecently = customers?.filter((c: any) => {
    if (!c.last_activity_at) return true
    return new Date(c.last_activity_at) < thirtyDaysAgo
  }) ?? []

  const context = `
Dato i dag: ${today}
Totalt kunder: ${customers?.length ?? 0}
Kunder uten aktiv avtale: ${noActiveAgreement.map((c: any) => c.name).slice(0, 5).join(", ") || "ingen"}
Avtaler som utløper de neste 30 dagene: ${expiring?.map((a: any) => `${a.title} (${a.end_date})`).join(", ") || "ingen"}
Kunder ikke kontaktet siste 30 dager: ${notContactedRecently.map((c: any) => c.name).slice(0, 5).join(", ") || "ingen"}
Siste aktiviteter: ${recentNotes?.slice(0, 5).map((n: any) => n.content?.substring(0, 60)).join(" | ") || "ingen"}
`

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Du er en CRM-assistent. Basert på denne oversikten, gi 3 konkrete og korte handlingsforslag for hva brukeren bør gjøre i dag. Svar med kun en JSON-array med 3 strenger. Hvert forslag skal være maks 80 tegn og starte med et verb. Eksempel: ["Ring Ola Nordmann — avtalen utløper om 5 dager", "Opprett ny avtale for Kari Hansen — ingen aktiv avtale", "Følg opp Bedrift AS — ikke kontaktet på 45 dager"]\n\nOversikt:\n${context}`,
    }],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "[]"
  let suggestions: string[] = []
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) suggestions = JSON.parse(match[0])
  } catch {
    suggestions = [raw]
  }

  return NextResponse.json({ suggestions })
}
