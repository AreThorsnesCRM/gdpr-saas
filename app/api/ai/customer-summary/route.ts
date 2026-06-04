import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 500 })

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get("customerId")
  if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 })

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
    .select("ai_assistant_enabled")
    .eq("id", accountUser.account_id)
    .single()

  if (!account?.ai_assistant_enabled) {
    return NextResponse.json({ error: "AI not enabled" }, { status: 403 })
  }

  const [
    { data: customer },
    { data: agreements },
    { data: notes },
  ] = await Promise.all([
    supabase.from("customers").select("name, email, phone, org_nummer, city").eq("id", customerId).single(),
    supabase.from("agreements").select("title, start_date, end_date, signed, archived, signing_status").eq("customer_id", customerId).order("start_date", { ascending: false }),
    supabase.from("notes").select("content, created_at").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(15),
  ])

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  const today = new Date().toISOString().split("T")[0]
  const activeAgreements = agreements?.filter((a: any) => !a.archived && a.end_date >= today) ?? []
  const expiredAgreements = agreements?.filter((a: any) => a.archived || a.end_date < today) ?? []

  const context = `
Kunde: ${customer.name}
E-post: ${customer.email || "ikke registrert"}
Telefon: ${customer.phone || "ikke registrert"}
Org.nr: ${customer.org_nummer || "ikke registrert"}
Sted: ${customer.city || "ikke registrert"}

Aktive avtaler (${activeAgreements.length}):
${activeAgreements.map((a: any) => `- ${a.title}: ${a.start_date} → ${a.end_date}${a.signing_status === "signed" ? " (signert)" : ""}`).join("\n") || "Ingen"}

Avsluttede/arkiverte avtaler (${expiredAgreements.length}):
${expiredAgreements.slice(0, 5).map((a: any) => `- ${a.title}: ${a.start_date} → ${a.end_date}`).join("\n") || "Ingen"}

Siste aktiviteter (${notes?.length ?? 0} totalt):
${notes?.slice(0, 8).map((n: any) => `- ${new Date(n.created_at).toLocaleDateString("no-NO")}: ${n.content}`).join("\n") || "Ingen aktivitet registrert"}
`

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Lag et kort, profesjonelt sammendrag av denne kunden for bruk før et møte. Maks 4–5 setninger. Inkluder nøkkelpunkter om kundeforhold, aktive avtaler og siste aktivitet. Skriv på norsk.\n\n${context}`,
    }],
  })

  const summary = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  return NextResponse.json({ summary })
}
