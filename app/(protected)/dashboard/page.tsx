"use client"

export const dynamic = "force-dynamic"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import {
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckIcon,
} from "@heroicons/react/24/outline"
import SubscribeButton from "../../components/SubscribeButton"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"

type StatsState = {
  customers: number
  activeAgreements: number
  expiringSoon: number
  customersWithoutActive: number
  unsignedAgreements: number
  totalAgreements: number
}

export default function DashboardPage() {
  const { user, account, restrictToOwn, loading: authLoading } = useAuth()
  const t = useTranslations("dashboard")
  const tad = useTranslations("agreementDetail")
  const tc = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()

  const [stats, setStats] = useState<StatsState>({
    customers: 0,
    activeAgreements: 0,
    expiringSoon: 0,
    customersWithoutActive: 0,
    unsignedAgreements: 0,
    totalAgreements: 0,
  })
  const [pendingAgreements, setPendingAgreements] = useState<any[]>([])
  const [criticalCustomers, setCriticalCustomers] = useState<any[]>([])
  const [uncontactedCustomers, setUncontactedCustomers] = useState<any[]>([])

  const [customersList, setCustomersList] = useState<{ id: string; name: string }[]>([])
  const [quickModalOpen, setQuickModalOpen] = useState(false)
  const [quickCustomerId, setQuickCustomerId] = useState("")
  const [quickTitle, setQuickTitle] = useState("")
  const [quickStart, setQuickStart] = useState("")
  const [quickEnd, setQuickEnd] = useState("")
  const [quickSaving, setQuickSaving] = useState(false)

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchStats()
    fetchPending()
    fetchCriticalCustomers()
    fetchUncontacted()
  }, [user, restrictToOwn])

  useEffect(() => {
    if (!supabase || !user) return
    supabase.from("customers").select("id, name").order("name")
      .then(({ data }) => setCustomersList(data ?? []))
  }, [user])

  useEffect(() => {
    if (!account?.ai_assistant_enabled || !account?.ai_dashboard_widget_enabled) return
    setAiLoading(true)
    fetch(`/api/ai/dashboard-suggestions?locale=${locale}`)
      .then((r) => r.json())
      .then((data) => { if (data.suggestions) setAiSuggestions(data.suggestions) })
      .finally(() => setAiLoading(false))
  }, [account?.ai_assistant_enabled, account?.ai_dashboard_widget_enabled])

  function openQuickModal() {
    setQuickCustomerId(""); setQuickTitle(""); setQuickStart(""); setQuickEnd("")
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
      }).select().single()
      if (newAgreement) router.push(`/agreements/${newAgreement.id}`)
    } finally {
      setQuickSaving(false)
    }
  }

  async function fetchStats() {
    if (!supabase) return

    let customersQuery = supabase.from("customers").select("id")
    if (restrictToOwn && user) customersQuery = customersQuery.eq("account_manager_id", user.id)
    const { data: customers } = await customersQuery
    const { data: agreements } = await supabase.from("agreements").select("id, archived, start_date, end_date, customer_id, signed, signing_status")

    const today = new Date().toISOString().split("T")[0]
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const active = agreements?.filter(
      (a: any) => !a.archived && a.signed && a.start_date <= today && a.end_date >= today
    ).length ?? 0

    const soon = agreements?.filter(
      (a: any) => !a.archived && a.signed && a.end_date >= today && a.end_date <= in30Days
    ).length ?? 0

    const unsigned = agreements?.filter(
      (a: any) => !a.archived && !a.signed
    ).length ?? 0

    const customersWithActive = new Set(
      agreements?.filter((a: any) => !a.archived && a.signed && a.start_date <= today && (!a.end_date || a.end_date >= today))
        .map((a: any) => a.customer_id)
    )
    const withoutActive = customers?.filter((c: any) => !customersWithActive.has(c.id)).length ?? 0

    setStats({
      customers: customers?.length ?? 0,
      activeAgreements: active,
      expiringSoon: soon,
      customersWithoutActive: withoutActive,
      unsignedAgreements: unsigned,
      totalAgreements: agreements?.length ?? 0,
    })
  }

  async function fetchPending() {
    if (!supabase) return
    const { data } = await supabase
      .from("agreements")
      .select("id, title, customers(name)")
      .eq("archived", false)
      .eq("signed", false)
      .eq("signing_status", "pending")
      .order("created_at", { ascending: false })
      .limit(4)
    setPendingAgreements(data ?? [])
  }

  async function fetchCriticalCustomers() {
    if (!supabase) return
    const today = new Date().toISOString().split("T")[0]

    let critQuery = supabase.from("customers").select("id, name, email")
    if (restrictToOwn && user) critQuery = critQuery.eq("account_manager_id", user.id)
    const { data: customers } = await critQuery
    const { data: agreements } = await supabase.from("agreements").select("customer_id, archived, start_date, end_date")

    if (!customers || !agreements) return

    const enriched = customers.map((c: any) => {
      const all = agreements.filter((a: any) => a.customer_id === c.id)
      const hasActive = all.some((a: any) => !a.archived && (!a.end_date || a.end_date >= today))
      const ended = all
        .filter((a: any) => a.end_date && a.end_date < today)
        .sort((a: any, b: any) => b.end_date.localeCompare(a.end_date))
      const daysSinceEnd = ended[0]
        ? Math.ceil((Date.now() - new Date(ended[0].end_date).getTime()) / 86400000)
        : null
      return { ...c, hasActive, neverHadAgreement: all.length === 0, daysSinceEnd }
    })

    setCriticalCustomers(
      enriched
        .filter((c: any) => !c.hasActive)
        .sort((a: any, b: any) => {
          if (a.neverHadAgreement !== b.neverHadAgreement) return a.neverHadAgreement ? -1 : 1
          return (a.daysSinceEnd ?? 999999) - (b.daysSinceEnd ?? 999999)
        })
        .slice(0, 4)
    )
  }

  async function fetchUncontacted() {
    if (!supabase) return

    let customersQuery = supabase.from("customers").select("id, name")
    if (restrictToOwn && user) customersQuery = customersQuery.eq("account_manager_id", user.id)
    const { data: customers } = await customersQuery
    const { data: notes } = await supabase
      .from("notes")
      .select("customer_id, created_at")
      .order("created_at", { ascending: false })

    if (!customers) return

    const latestNoteMap = new Map<string, string>()
    for (const note of notes ?? []) {
      if (!latestNoteMap.has(note.customer_id)) {
        latestNoteMap.set(note.customer_id, note.created_at)
      }
    }

    const enriched = customers.map((c: any) => {
      const lastActivity = latestNoteMap.get(c.id) ?? null
      const daysSince = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000)
        : null
      return { ...c, lastActivity, daysSince }
    })

    setUncontactedCustomers(
      enriched
        .sort((a: any, b: any) => {
          if (!a.lastActivity && !b.lastActivity) return 0
          if (!a.lastActivity) return -1
          if (!b.lastActivity) return 1
          return new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
        })
        .slice(0, 4)
    )
  }

  const to = useTranslations("onboarding")
  const status = account?.subscription_status
  const showBanner = !authLoading && status && status !== "active"
  const checklistDone = !!(account?.country && stats.customers > 0 && stats.totalAgreements > 0)
  const dateLocale = locale === "en" ? "en-GB" : "no-NO"

  function daysLeft(dateString: string | null) {
    if (!dateString) return null
    return Math.ceil((new Date(dateString).getTime() - Date.now()) / 86400000)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl">

      {showBanner && (
        <div className={`rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
          status === "past_due" ? "bg-red-900/20 border border-red-700/40" :
          status === "canceled" ? "bg-gray-800 border border-gray-700" :
          "bg-slate-800 border border-slate-700"
        }`}>
          <div>
            <p className="font-semibold text-white">
              {status === "trialing" && t("trialDaysLeft", { days: daysLeft(account?.trial_end ?? null) ?? 0 })}
              {status === "past_due" && t("paymentFailed")}
              {status === "canceled" && t("canceled")}
              {status === "incomplete" && t("incomplete")}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">
              {status === "trialing" && t("trialBannerDesc")}
              {status === "past_due" && t("paymentFailedDesc")}
              {status === "canceled" && t("canceledDesc")}
              {status === "incomplete" && t("incompleteDesc")}
            </p>
          </div>
          <div className="shrink-0 sm:ml-6">
            {status === "trialing" && <SubscribeButton label={t("startSubscription")} mode="checkout" />}
            {status === "past_due" && <SubscribeButton label={t("updatePayment")} mode="portal" />}
            {status === "canceled" && <SubscribeButton label={t("restart")} mode="checkout" />}
            {status === "incomplete" && <SubscribeButton label={t("completePurchase")} mode="checkout" />}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/customers/new"
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            {t("newCustomer")}
          </Link>
          <button
            onClick={openQuickModal}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            {t("newAgreement")}
          </button>
        </div>
      </div>

      {account?.ai_assistant_enabled && account?.ai_dashboard_widget_enabled && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 text-base">✦</span>
            <p className="text-sm font-semibold">{t("aiWidgetTitle")}</p>
          </div>
          {aiLoading ? (
            <div className="flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : aiSuggestions.length > 0 ? (
            <ol className="space-y-1.5">
              {aiSuggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                  <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-white/60">Ingen forslag tilgjengelig akkurat nå.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/customers">
          <StatCard title={t("statCustomers")} value={stats.customers}
            subtitle={t("statCustomersSubtitle")}
            icon={<UserGroupIcon className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50" />
        </Link>
        <Link href="/agreements?filter=unsigned">
          <StatCard title={t("statUnsignedAgreements")} value={stats.unsignedAgreements}
            subtitle={t("statUnsignedSubtitle")}
            icon={<ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />}
            bg="bg-orange-50" />
        </Link>
        <Link href="/agreements?filter=active">
          <StatCard title={t("statActiveAgreements")} value={stats.activeAgreements}
            subtitle={t("statActiveSubtitle")}
            icon={<CheckCircleIcon className="h-5 w-5 text-green-600" />}
            bg="bg-green-50" />
        </Link>
        <Link href="/agreements?filter=expiresSoon">
          <StatCard title={t("statExpiringSoon")} value={stats.expiringSoon}
            subtitle={t("statExpiringSoonSubtitle")}
            icon={<ClockIcon className="h-5 w-5 text-amber-500" />}
            bg="bg-amber-50" />
        </Link>
      </div>

      {!authLoading && !checklistDone && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{to("checklistTitle")}</h2>
          <div className="space-y-3">
            <ChecklistItem done={!!account?.country} label={to("checklistCountry")} />
            <ChecklistItem done={stats.customers > 0} label={to("checklistCustomer")} />
            <ChecklistItem done={stats.totalAgreements > 0} label={to("checklistAgreement")} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t("pendingTitle")}</h2>
            <Link href="/agreements?filter=pending" className="text-xs text-slate-500 hover:text-slate-800">{t("seeAll")}</Link>
          </div>
          {pendingAgreements.length === 0 ? (
            <p className="text-sm text-gray-400">{t("pendingEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {pendingAgreements.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.customers?.name}</p>
                  </div>
                  <Link href={`/agreements/${a.id}`} className="text-xs text-slate-500 hover:text-slate-800">{t("open")}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t("criticalTitle")}</h2>
            <Link href="/customers?noActive=true" className="text-xs text-slate-500 hover:text-slate-800">{t("seeAll")}</Link>
          </div>
          {criticalCustomers.length === 0 ? (
            <p className="text-sm text-gray-400">{t("criticalEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {criticalCustomers.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      {c.neverHadAgreement ? t("neverHad") : t("expiredDaysAgo", { days: c.daysSinceEnd })}
                    </p>
                  </div>
                  <Link href={`/customers/${c.id}`} className="text-xs text-slate-500 hover:text-slate-800">{t("open")}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t("uncontactedTitle")}</h2>
            <Link href="/customers" className="text-xs text-slate-500 hover:text-slate-800">{t("seeAll")}</Link>
          </div>
          {uncontactedCustomers.length === 0 ? (
            <p className="text-sm text-gray-400">{t("uncontactedEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {uncontactedCustomers.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      {c.lastActivity ? t("uncontactedDaysAgo", { days: c.daysSince }) : t("uncontactedNever")}
                    </p>
                  </div>
                  <Link href={`/customers/${c.id}`} className="text-xs text-slate-500 hover:text-slate-800">{t("open")}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

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
                  {customersList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-3 text-sm ${done ? "text-gray-400 line-through" : "text-gray-700"}`}>
      <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${done ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
        {done && <CheckIcon className="h-3 w-3 text-white" />}
      </span>
      {label}
    </div>
  )
}

function StatCard({ title, value, icon, bg, subtitle }: {
  title: string
  value: number
  icon: React.ReactNode
  bg: string
  subtitle?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors cursor-pointer">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  )
}
