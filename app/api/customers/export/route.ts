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

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const accountUser = await getAuthenticatedAccount()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, phone, org_nummer, address, postal_code, city, account_manager_id")
    .eq("account_id", accountUser.account_id)
    .order("name", { ascending: true })

  const customerIds = (customers ?? []).map(c => c.id)

  const today = new Date().toISOString().split("T")[0]

  const { data: agreements } = customerIds.length > 0
    ? await supabaseAdmin
        .from("agreements")
        .select("customer_id, archived, end_date")
        .in("customer_id", customerIds)
    : { data: [] }

  const { data: members } = await supabaseAdmin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountUser.account_id)

  const memberIds = members?.map(m => m.user_id) ?? []
  const { data: profiles } = memberIds.length > 0
    ? await supabaseAdmin.from("profiles").select("user_id, full_name").in("user_id", memberIds)
    : { data: [] }

  const managerMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) ?? [])

  const activeAgreements = new Map<string, number>()
  for (const a of agreements ?? []) {
    if (!a.archived && a.end_date >= today) {
      activeAgreements.set(a.customer_id, (activeAgreements.get(a.customer_id) ?? 0) + 1)
    }
  }

  const rows = (customers ?? []).map(c => ({
    Navn: c.name,
    "E-post": c.email ?? "",
    Telefon: c.phone ?? "",
    "Org.nr": c.org_nummer ?? "",
    Adresse: c.address ?? "",
    Postnummer: c.postal_code ?? "",
    Sted: c.city ?? "",
    Kundeansvarlig: managerMap.get(c.account_manager_id) ?? "",
    "Aktive avtaler": activeAgreements.get(c.id) ?? 0,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws["!cols"] = [
    { wch: 25 }, { wch: 28 }, { wch: 16 }, { wch: 14 },
    { wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 14 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Kunder")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kunder-${today}.xlsx"`,
    },
  })
}
