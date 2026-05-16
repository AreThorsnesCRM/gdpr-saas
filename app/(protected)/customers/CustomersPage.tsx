"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import { TrashIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline"
import ExcelImportModal from "@/app/components/ExcelImportModal"
import { useTranslations } from "next-intl"

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  org_nummer: string | null
  city: string | null
  account_manager_id: string | null
  hasActiveAgreement?: boolean
  hasNeverHadAgreement?: boolean
  daysSinceEnd?: number | null
  lastActivity?: string | null
}

type TeamMember = {
  user_id: string
  full_name: string
}

export default function CustomersPage() {
  const { user, restrictToOwn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("customers")
  const tc = useTranslations("common")

  const statusFilters = [
    { id: "all",      label: t("filterAll") },
    { id: "active",   label: t("filterActive") },
    { id: "noActive", label: t("filterNoActive") },
    { id: "never",    label: t("filterNever") },
  ]

  const [customers, setCustomers] = useState<Customer[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const [importOpen, setImportOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [managerFilter, setManagerFilter] = useState("")
  const [sortKey, setSortKey] = useState<"name" | "lastActivity">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    if (searchParams.get("noActive") === "true") setStatusFilter("noActive")
    else if (searchParams.get("status") === "active") setStatusFilter("active")
    else if (searchParams.get("status") === "never") setStatusFilter("never")
  }, [searchParams])

  useEffect(() => {
    if (user) loadCustomers()
  }, [user, restrictToOwn])

  useEffect(() => {
    fetch("/api/account/members")
      .then((r) => r.json())
      .then(({ members }) => { if (members) setTeamMembers(members) })
  }, [])

  async function loadCustomers() {
    if (!supabase) return
    setLoading(true)

    const today = new Date().toISOString().split("T")[0]

    let customerQuery = supabase
      .from("customers")
      .select("id, name, email, phone, org_nummer, city, account_manager_id")
    if (restrictToOwn && user) customerQuery = customerQuery.eq("account_manager_id", user.id)
    const { data: customerData } = await customerQuery

    const [{ data: agreements }, { data: notes }] = await Promise.all([
      supabase.from("agreements").select("customer_id, archived, end_date"),
      supabase.from("notes").select("customer_id, created_at").order("created_at", { ascending: false }),
    ])

    if (!customerData) { setLoading(false); return }

    const latestNoteMap = new Map<string, string>()
    for (const note of notes ?? []) {
      if (!latestNoteMap.has(note.customer_id)) {
        latestNoteMap.set(note.customer_id, note.created_at)
      }
    }

    const enriched = customerData.map((c) => {
      const all = (agreements ?? []).filter((a) => a.customer_id === c.id)
      const hasActive = all.some((a) => !a.archived && (!a.end_date || a.end_date >= today))
      const ended = all
        .filter((a) => a.end_date && a.end_date < today)
        .sort((a, b) => b.end_date.localeCompare(a.end_date))
      const daysSinceEnd = ended[0]
        ? Math.ceil((Date.now() - new Date(ended[0].end_date).getTime()) / 86400000)
        : null

      return {
        ...c,
        hasActiveAgreement: hasActive,
        hasNeverHadAgreement: all.length === 0,
        daysSinceEnd,
        lastActivity: latestNoteMap.get(c.id) ?? null,
      }
    })

    setCustomers(enriched)
    setLoading(false)
  }

  async function deleteCustomer(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!supabase || !window.confirm(t("deleteConfirm"))) return
    await supabase.from("customers").delete().eq("id", id)
    loadCustomers()
  }

  function relativeActivity(dateStr: string | null): string {
    if (!dateStr) return t("neverContacted")
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return t("activityToday")
    if (days === 1) return t("activityYesterday")
    return t("activityDaysAgo", { days })
  }

  function toggleSort(key: "name" | "lastActivity") {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const filtered = customers
    .filter((c) => {
      if (statusFilter === "active")   return c.hasActiveAgreement
      if (statusFilter === "noActive") return !c.hasActiveAgreement
      if (statusFilter === "never")    return c.hasNeverHadAgreement
      return true
    })
    .filter((c) => !managerFilter || c.account_manager_id === managerFilter)
    .filter((c) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.org_nummer?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        false
      )
    })
    .sort((a, b) => {
      if (sortKey === "lastActivity") {
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
        return sortDir === "asc" ? aTime - bTime : bTime - aTime
      }
      return sortDir === "asc"
        ? a.name.localeCompare(b.name, "no")
        : b.name.localeCompare(a.name, "no")
    })

  function Badge({ c }: { c: Customer }) {
    if (c.hasActiveAgreement)
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">{t("badgeActive")}</span>
    if (c.hasNeverHadAgreement)
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">{t("badgeNone")}</span>
    if (c.daysSinceEnd != null)
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">{t("badgeExpired", { days: c.daysSinceEnd })}</span>
    return null
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {t("importExcel")}
          </button>
          <Link href="/customers/new"
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            {t("newCustomer")}
          </Link>
        </div>
      </div>

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { loadCustomers(); setImportOpen(false) }}
      />

      {/* Filtre */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
          />
          {teamMembers.length > 1 && (
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white text-gray-700"
            >
              <option value="">{t("allManagers")}</option>
              {teamMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((f) => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === f.id
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabell */}
      {loading ? (
        <p className="text-sm text-gray-400">{tc("loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">{t("noResults")}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wide">
                    {t("columnName")}
                    <span className="text-gray-300">{sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnOrg")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnCity")}</th>
                {teamMembers.length > 0 && (
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnManager")}</th>
                )}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnAgreement")}</th>
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort("lastActivity")} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wide">
                    {t("columnLastActivity")}
                    <span className="text-gray-300">{sortKey === "lastActivity" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const managerName = c.account_manager_id
                  ? teamMembers.find(m => m.user_id === c.account_manager_id)?.full_name ?? "—"
                  : "—"
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{c.org_nummer ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{c.city ?? "—"}</td>
                    {teamMembers.length > 0 && (
                      <td className="px-4 py-3 text-gray-500 text-sm">{managerName}</td>
                    )}
                    <td className="px-4 py-3"><Badge c={c} /></td>
                    <td className="px-4 py-3 text-sm">
                      <span className={c.lastActivity ? "text-gray-500" : "text-gray-300"}>
                        {relativeActivity(c.lastActivity ?? null)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => deleteCustomer(e, c.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title={t("deleteTooltip")}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400">{t("count", { count: filtered.length })}</p>
      )}
    </div>
  )
}
