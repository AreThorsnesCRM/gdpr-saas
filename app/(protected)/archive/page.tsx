"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import { useTranslations, useLocale } from "next-intl"

type Agreement = {
  id: string
  title: string
  start_date: string
  end_date: string
  signed: boolean
  customers: { name: string; account_manager_id: string | null }
  agreement_categories: { id: string; name: string } | null
}

export default function ArchivePage() {
  const router = useRouter()
  const { user, restrictToOwn } = useAuth()
  const t = useTranslations("archive")
  const ta = useTranslations("agreements")
  const tc = useTranslations("common")
  const locale = useLocale()

  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<"title" | "customer" | "category" | "period" | "signed" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchArchived()
  }, [user, restrictToOwn])

  async function fetchArchived() {
    if (!supabase) return
    setLoading(true)

    let query = supabase
      .from("agreements")
      .select("id, title, start_date, end_date, signed, customers!inner(name, account_manager_id), agreement_categories(id, name)")
      .eq("archived", true)
      .order("end_date", { ascending: false })

    if (restrictToOwn && user) {
      query = query.eq("customers.account_manager_id", user.id)
    }

    const { data } = await query
    setAgreements((data ?? []) as unknown as Agreement[])
    setLoading(false)
  }

  function toggleSort(key: "title" | "customer" | "category" | "period" | "signed") {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  async function handleRestore(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!supabase || !window.confirm(t("restoreConfirm"))) return
    setRestoringId(id)
    await supabase.from("agreements").update({ archived: false }).eq("id", id)
    setAgreements(prev => prev.filter(a => a.id !== id))
    setRestoringId(null)
  }

  const filtered = agreements
    .filter(a => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        a.title.toLowerCase().includes(q) ||
        (a.customers?.name ?? "").toLowerCase().includes(q) ||
        (a.agreement_categories?.name ?? "").toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (!sortKey) return 0
      if (sortKey === "signed") {
        const valA = a.signed ? 1 : 0
        const valB = b.signed ? 1 : 0
        return sortDir === "asc" ? valA - valB : valB - valA
      }
      if (sortKey === "period") {
        return sortDir === "asc"
          ? a.end_date.localeCompare(b.end_date)
          : b.end_date.localeCompare(a.end_date)
      }
      const valA = sortKey === "title" ? a.title : sortKey === "customer" ? (a.customers?.name ?? "") : (a.agreement_categories?.name ?? "")
      const valB = sortKey === "title" ? b.title : sortKey === "customer" ? (b.customers?.name ?? "") : (b.agreement_categories?.name ?? "")
      return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

  const dateLocale = locale === "en" ? "en-GB" : "no-NO"
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <a
          href={`/api/agreements/export?locale=${locale}&archived=true`}
          className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          ↓ {tc("export")}
        </a>
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={ta("searchPlaceholder")}
          className="pl-3 pr-8 py-1.5 rounded-full text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-300 w-64"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{tc("loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort("title")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                    {ta("columnTitle")}
                    <span className="text-gray-300">{sortKey === "title" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort("customer")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                    {ta("columnCustomer")}
                    <span className="text-gray-300">{sortKey === "customer" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort("category")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                    {ta("columnCategory")}
                    <span className="text-gray-300">{sortKey === "category" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort("period")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                    {ta("columnPeriod")}
                    <span className="text-gray-300">{sortKey === "period" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort("signed")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                    {ta("columnSigned")}
                    <span className="text-gray-300">{sortKey === "signed" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/agreements/${a.id}`)}
                  className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                  <td className="px-4 py-3 text-gray-500">{a.customers?.name}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-gray-500">
                    {a.agreement_categories?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(a.start_date)} – {formatDate(a.end_date)}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3">
                    {a.signed
                      ? <span className="text-green-600 font-medium">✓</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => handleRestore(a.id, e)}
                      disabled={restoringId === a.id}
                      className="text-xs text-slate-500 hover:text-slate-900 border border-gray-200 hover:border-gray-300 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {restoringId === a.id ? "..." : tc("restore")}
                    </button>
                  </td>
                </tr>
              ))}
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
