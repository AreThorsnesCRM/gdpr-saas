import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(contextBlock: string, contextLevel: string): string {
  return `Du er en hjelpsom AI-assistent innebygd i Pactiva — et CRM-system for bedrifter som administrerer kunder og avtaler med fokus på GDPR-samsvar.

== Om Pactiva ==
- Kunder: legg til, rediger, søk og filtrer kunder. Logg aktivitet (notater, samtaler, møter, e-post) per kunde.
- Avtaler: opprett avtaler med start/sluttdato, last opp PDF-dokument, send til digital signering via BankID (NO), BankID SE (SE), MitID (DK) eller FTN (FI) basert på kontoens land.
- Maler: lag gjenbrukbare avtalemaler med flettefelt: {{customer.name}}, {{customer.org_number}}, {{customer.address}}, {{agreement.start_date}}, {{agreement.end_date}}, {{company.name}}, {{company.org_number}}.
- Dashboard: oversikt over aktive avtaler, utløpende snart, kunder uten aktiv avtale, og kunder ikke kontaktet nylig.
- Digital signering: avtaler sendes via Signicat. Signaturen er juridisk bindende og bruker e-ID tilpasset kontoens land.
- Arkiv: avtalene kan arkiveres, søkes opp og gjenopprettes.
- Innstillinger: firmainformasjon, brukere og roller, e-postvarsler, abonnement via Stripe.

== Brukerkontekst (${contextLevel === "full" ? "full" : "begrenset"}) ==
${contextBlock}

== Instruksjoner ==
- Svar konsist og på samme språk som brukeren skriver på.
- Når du hjelper med å skrive avtaletekst, lag profesjonelle og tydelige formuleringer tilpasset norsk forretningspraksis.
- Gi konkrete navigasjonsforslag når det passer ("Gå til Kunder → Ny kunde", "Åpne avtalen → Digital signering", osv.).
- Du kan ikke utføre handlinger direkte, men veiled brukeren steg for steg.
- Hold svar korte med mindre brukeren ber om detaljert hjelp.`
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "din-api-nøkkel-her") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY ikke konfigurert" }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { message, history, contextLevel = "limited", pageHint = "" } = await req.json()

  const { data: accountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .single()

  if (!accountUser) return NextResponse.json({ error: "Ingen konto funnet" }, { status: 403 })

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("name, country, subscription_status, ai_assistant_enabled")
    .eq("id", accountUser.account_id)
    .single()

  if (!account?.ai_assistant_enabled) {
    return NextResponse.json({ error: "AI-assistenten er ikke aktivert for denne kontoen" }, { status: 403 })
  }

  const [{ count: customerCount }, { count: agreementCount }] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("agreements").select("id", { count: "exact", head: true }).eq("archived", false),
  ])

  let contextBlock: string

  if (contextLevel === "full") {
    const [{ data: customers }, { data: agreements }] = await Promise.all([
      supabase.from("customers").select("name").order("created_at", { ascending: false }).limit(10),
      supabase.from("agreements").select("title, start_date, end_date, signing_status").eq("archived", false).order("end_date", { ascending: true }).limit(10),
    ])

    const customerList = customers?.map(c => c.name).join(", ") || "ingen"
    const agreementList = agreements?.map(a =>
      `${a.title} (${a.start_date} → ${a.end_date}${a.signing_status ? ", " + a.signing_status : ""})`
    ).join("; ") || "ingen"

    contextBlock = `Kontonavn: ${account.name || "ukjent"}
Land: ${account.country || "ikke satt"}
Abonnement: ${account.subscription_status || "ukjent"}
Antall kunder totalt: ${customerCount ?? 0}
Aktive avtaler: ${agreementCount ?? 0}
Nåværende side: ${pageHint || "ukjent"}
Siste kunder: ${customerList}
Aktive avtaler (nyligste): ${agreementList}`
  } else {
    contextBlock = `Land: ${account.country || "ikke satt"}
Abonnement: ${account.subscription_status || "ukjent"}
Antall kunder: ${customerCount ?? 0}
Aktive avtaler: ${agreementCount ?? 0}
Nåværende side: ${pageHint || "ukjent"}
(Navn og innhold er skjult — bytt til full kontekst for mer spesifikk hjelp)`
  }

  const systemPrompt = buildSystemPrompt(contextBlock, contextLevel)

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []),
    { role: "user", content: message },
  ]

  const stream = anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
