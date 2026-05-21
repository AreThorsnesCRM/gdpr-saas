"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import { useTranslations, useLocale } from "next-intl"
import { getCategoryDisplayName } from "@/lib/categoryUtils"

type Agreement = {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  archived: boolean
  customer_id: string
  category_id: string | null
  customers: { name: string; account_manager_id: string | null }
  agreement_categories: { id: string; name: string } | null
}

type Customer = { id: string; name: string }
type Category = { id: string; name: string; is_predefined?: boolean }
type Filter = "all" | "active" | "expired" | "upcoming" | "expiresSoon" | "archived"

export default function AgreementsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, restrictToOwn } = useAuth()
  const t = useTranslations("agreements")
  const tad = useTranslations("agreementDetail")
  const tc = useTranslations("common")
  const locale = useLocale()

  const filterOptions: { id: Filter; label: string }[] = [
    { id: "all",         label: t("filterAll") },
    { id: "active",      label: t("filterActive") },
    { id: "expiresSoon", label: t("filterExpiresSoon") },
    { id: "upcoming",    label: t("filterUpcoming") },
    { id: "expired",     label: t("filterExpired") },
    { id: "archived",    label: t("filterArchived") },
  ]

  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<"title" | "customer" | "category" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [quickModalOpen, setQuickModalOpen] = useState(false)
  const [quickCustomerId, setQuickCustomerId] = useState("")
  const [quickTitle, setQuickTitle] = useState("")
  const [quickStart, setQuickStart] = useState("")
  const [quickEnd, setQuickEnd] = useState("")
  const [quickCategoryId, setQuickCategoryId] = useState("")
  const [quickSaving, setQuickSaving] = useState(false)

  useEffect(() => {
    const urlFilter = searchParams.get("filter")
    const expiresSoon = searchParams.get("expiresSoon")
    const status = searchParams.get("status")

    if (urlFilter && filterOptions.some((f) => f.id === urlFilter)) {
      setFilter(urlFilter as Filter)
    } else if (expiresSoon === "true") {
      setFilter("expiresSoon")
    } else if (status === "active") {
      setFilter("active")
    } else {
      setFilter("all")
    }
  }, [searchParams])

  useEffect(() => {
    if (!supabase) return
    fetchAgreements()
  }, [user, restrictToOwn])

  useEffect(() => {
    if (!supabase || !user) return
    supabase.from("customers").select("id, name").order("name")
      .then(({ data }) => setCustomers(data ?? []))
  }, [user])

  useEffect(() => {
    fetch("/api/account/agreement-categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
  }, [])

  async function fetchAgreements() {
    if (!supabase) return
    setLoading(true)

    let query = supabase
      .from("agreements")
      .select("*, customers!inner(name, account_manager_id), agreement_categories(id, name)")
      .order("end_date", { ascending: true })

    if (restrictToOwn && user) {
      query = query.eq("customers.account_manager_id", user.id)
    }

    const { data } = await query
    setAgreements(data ?? [])
    setLoading(false)
  }

  function openQuickModal() {
    setQuickCustomerId(""); setQuickTitle(""); setQuickStart(""); setQuickEnd(""); setQuickCategoryId("")
    setQuickModalOpen(true)
  }

  async function handleCreateQuickAgreement() {
    if (!supabase || !user || !quickCustomerId || !quickTitle || !quickStart || !quickEnd) return
    setQuickSaving(true)
    try {
      const { data: newAgreement } = await supabase.from("agreements").insert({
        customer_id: quickCustomerId,
        user_id: user.id,
        title: quickTitle,
        start_date: quickStart,
        end_date: quickEnd,
        signed: false,
        archived: false,
        ...(quickCategoryId ? { category_id: quickCategoryId } : {}),
      }).select().single()
      if (newAgreement) router.push(`/agreements/${newAgreement.id}`)
    } finally {
      setQuickSaving(false)
    }
  }

  function daysUntil(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  function getStatus(a: Agreement): "active" | "expired" | "upcoming" | "archived" {
    const today = new Date().toISOString().split("T")[0]
    if (a.archived) return "archived"
    if (a.end_date < today) return "expired"
    if (a.start_date > today) return "upcoming"
    return "active"
  }

  function applyFilter(f: Filter) {
    setFilter(f)
    router.push(f === "all" ? "/agreements" : `/agreements?filter=${f}`)
  }

  function toggleSort(key: "title" | "customer" | "category") {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filtered = agreements
    .filter((a) => {
      if (filter !== "all") {
        if (filter === "expiresSoon") {
          const days = daysUntil(a.end_date)
          if (!(!a.archived && days >= 0 && days <= 30)) return false
        } else if (getStatus(a) !== filter) {
          return false
        }
      }
      if (search) {
        const q = search.toLowerCase()
        return (
          a.title.toLowerCase().includes(q) ||
          (a.customers?.name ?? "").toLowerCase().includes(q) ||
          (a.agreement_categories?.name ?? "").toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (!sortKey) return 0
      const valA = sortKey === "title" ? a.title : sortKey === "customer" ? (a.customers?.name ?? "") : (a.agreement_categories?.name ?? "")
      const valB = sortKey === "title" ? b.title : sortKey === "customer" ? (b.customers?.name ?? "") : (b.agreement_categories?.name ?? "")
      return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

  const dateLocale = locale === "en" ? "en-GB" : "no-NO"

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })
  }

  function StatusBadge({ a }: { a: Agreement }) {
    const status = getStatus(a)
    const days = daysUntil(a.end_date)

    if (status === "archived")
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200">{t("statusArchived")}</span>
    if (status === "expired")
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">{t("statusExpired")}</span>
    if (status === "upcoming")
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-200">{t("statusUpcoming")}</span>
    if (days <= 7)
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">{t("statusExpiresDays", { days })}</span>
    if (days <= 30)
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">{t("statusExpiresDays", { days })}</span>
    return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">{t("statusActive")}</span>
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/api/agreements/export?locale=${locale}`}
            className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ↓ {tc("export")}
          </a>
          <button
            onClick={openQuickModal}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            {t("newAgreement")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-3 pr-8 py-1.5 rounded-full text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-300 w-64"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
          )}
        </div>
        {filterOptions.map((f) => (
          <button
            key={f.id}
            onClick={() => applyFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.id
                ? "bg-slate-800 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{tc("loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">{t("noResults")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort("title")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                    {t("columnTitle")}
                    <span className="text-gray-300">{sortKey === "title" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort("customer")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                    {t("columnCustomer")}
                    <span className="text-gray-300">{sortKey === "customer" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort("category")} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                    {t("columnCategory")}
                    <span className="text-gray-300">{sortKey === "category" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
                <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnPeriod")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
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
                  <td className="px-4 py-3">
                    <StatusBadge a={a} />
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

      {quickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">{t("newAgreement")}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{tad("labelCustomer")}</label>
                <select
                  value={quickCustomerId}
                  onChange={e => setQuickCustomerId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  autoFocus
                >
                  <option value="">{tad("customerPlaceholder")}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{tad("quickTitleLabel")}</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{tad("labelCategory")}</label>
                <select
                  value={quickCategoryId}
                  onChange={e => setQuickCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">{tad("labelNoCategory")}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{getCategoryDisplayName(c, tc)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{tad("quickStartLabel")}</label>
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" value={quickStart} onChange={e => setQuickStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{tad("quickEndLabel")}</label>
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" value={quickEnd} onChange={e => setQuickEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-1">
              <button onClick={() => setQuickModalOpen(false)} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">{tc("cancel")}</button>
              <button
                onClick={handleCreateQuickAgreement}
                disabled={quickSaving || !quickCustomerId || !quickTitle || !quickStart || !quickEnd}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {quickSaving ? tad("creating") : tad("createButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
