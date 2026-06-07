import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import * as XLSX from "xlsx"

async function getAuthenticatedAccount() {
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

export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const accountUser = await getAuthenticatedAccount()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const locale = searchParams.get("locale") ?? "no"
  const archivedOnly = searchParams.get("archived") === "true"

  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("account_id", accountUser.account_id)

  const customerIds = (customers ?? []).map(c => c.id)

  let agreementsQuery = customerIds.length > 0
    ? supabaseAdmin
        .from("agreements")
        .select("title, start_date, end_date, archived, signed, customers(name), agreement_categories(name)")
        .in("customer_id", customerIds)
        .order("end_date", { ascending: false })
    : null

  if (agreementsQuery && archivedOnly) {
    agreementsQuery = agreementsQuery.eq("archived", true)
  }

  const { data: agreements } = agreementsQuery ? await agreementsQuery : { data: [] }

  const today = new Date().toISOString().split("T")[0]

  const statusLabel = (a: any): string => {
    if (a.archived) return locale === "en" ? "Archived" : locale === "es" ? "Archivado" : "Arkivert"
    if (a.end_date < today) return locale === "en" ? "Expired" : locale === "es" ? "Vencido" : "Utløpt"
    if (a.start_date > today) return locale === "en" ? "Upcoming" : locale === "es" ? "Próximo" : "Kommende"
    return locale === "en" ? "Active" : locale === "es" ? "Activo" : "Aktiv"
  }

  const yesNo = (v: boolean) =>
    locale === "en" ? (v ? "Yes" : "No") : locale === "es" ? (v ? "Sí" : "No") : (v ? "Ja" : "Nei")

  const h =
    locale === "en"
      ? { title: "Title", customer: "Customer", category: "Category", start: "Start date", end: "End date", status: "Status", signed: "Signed" }
      : locale === "es"
      ? { title: "Título", customer: "Cliente", category: "Categoría", start: "Fecha inicio", end: "Fecha fin", status: "Estado", signed: "Firmado" }
      : { title: "Tittel", customer: "Kunde", category: "Kategori", start: "Startdato", end: "Sluttdato", status: "Status", signed: "Signert" }

  const rows = (agreements ?? []).map((a: any) => ({
    [h.title]: a.title,
    [h.customer]: a.customers?.name ?? "",
    [h.category]: a.agreement_categories?.name ?? "",
    [h.start]: a.start_date,
    [h.end]: a.end_date,
    [h.status]: statusLabel(a),
    [h.signed]: yesNo(a.signed ?? false),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws["!cols"] = [
    { wch: 30 }, { wch: 25 }, { wch: 22 },
    { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 10 },
  ]

  const sheetName = archivedOnly
    ? (locale === "en" ? "Archived agreements" : locale === "es" ? "Contratos archivados" : "Arkiverte avtaler")
    : (locale === "en" ? "Agreements" : locale === "es" ? "Contratos" : "Avtaler")
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const fileBase = archivedOnly
    ? (locale === "en" ? "archived-agreements" : locale === "es" ? "contratos-archivados" : "arkiverte-avtaler")
    : (locale === "en" ? "agreements" : locale === "es" ? "contratos" : "avtaler")
  const filename = `${fileBase}-${today}.xlsx`
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
