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
} from "@heroicons/react/24/outline"
import SubscribeButton from "../../components/SubscribeButton"
import AgreementSlideOver from "../../components/AgreementSlideOver"

type StatsState = {
  customers: number
  activeAgreements: number
  expiringSoon: number
  customersWithoutActive: number
}

export default function DashboardPage() {
  const { user, account, restrictToOwn, loading: authLoading } = useAuth()

  const [stats, setStats] = useState<StatsState>({
    customers: 0,
    activeAgreements: 0,
    expiringSoon: 0,
    customersWithoutActive: 0,
  })
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [criticalCustomers, setCriticalCustomers] = useState<any[]>([])

  // Slide-over state
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [customersList, setCustomersList] = useState<{ id: string; name: string }[]>([])
  const [customerId, setCustomerId] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newStart, setNewStart] = useState("")
  const [newEnd, setNewEnd] = useState("")
  const [newContactName, setNewContactName] = useState("")
  const [newContactEmail, setNewContactEmail] = useState("")
  const [newContactPhone, setNewContactPhone] = useState("")
  const [newSigned, setNewSigned] = useState(false)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchStats()
    fetchUpcoming()
    fetchCriticalCustomers()
  }, [user, restrictToOwn])

  useEffect(() => {
    if (!supabase || !user) return
    supabase
      .from("customers")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCustomersList(data ?? []))
  }, [user])

  function resetForm() {
    setCustomerId(""); setNewTitle(""); setNewStart(""); setNewEnd("")
    setNewContactName(""); setNewContactEmail(""); setNewContactPhone("")
    setNewSigned(false); setNewFile(null); setRemoveExistingFile(false)
  }

  async function handleSaveAgreement() {
    if (!supabase || !user || !customerId || !newTitle || !newStart || !newEnd) return

    let file_url: string | null = null
    if (newFile) {
      const fileExt = newFile.name.split(".").pop()
      const fileName = `${customerId}/${Date.now()}.${fileExt}`
      const { data: upload, error } = await supabase.storage.from("agreements").upload(fileName, newFile)
      if (!error && upload) {
        const { data: urlData } = supabase.storage.from("agreements").getPublicUrl(upload.path)
        file_url = urlData.publicUrl
      }
    }

    await supabase.from("agreements").insert({
      customer_id: customerId,
      user_id: user.id,
      title: newTitle,
      start_date: newStart,
      end_date: newEnd,
      contact_name: newContactName || null,
      contact_email: newContactEmail || null,
      contact_phone: newContactPhone || null,
      signed: newSigned,
      file_url,
      archived: false,
    })

    resetForm()
    setSlideOverOpen(false)
    fetchStats()
    fetchUpcoming()
  }

  async function fetchStats() {
    if (!supabase) return

    let customersQuery = supabase.from("customers").select("id")
    if (restrictToOwn && user) customersQuery = customersQuery.eq("account_manager_id", user.id)
    const { data: customers } = await customersQuery
    const { data: agreements } = await supabase.from("agreements").select("id, archived, end_date, customer_id")

    const today = new Date().toISOString().split("T")[0]
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const active = agreements?.filter(
      (a: any) => !a.archived && (!a.end_date || a.end_date >= today)
    ).length ?? 0

    const soon = agreements?.filter(
      (a: any) => !a.archived && a.end_date >= today && a.end_date <= in30Days
    ).length ?? 0

    const customersWithActive = new Set(
      agreements?.filter((a: any) => !a.archived && (!a.end_date || a.end_date >= today))
        .map((a: any) => a.customer_id)
    )
    const withoutActive = customers?.filter((c: any) => !customersWithActive.has(c.id)).length ?? 0

    setStats({
      customers: customers?.length ?? 0,
      activeAgreements: active,
      expiringSoon: soon,
      customersWithoutActive: withoutActive,
    })
  }

  async function fetchUpcoming() {
    if (!supabase) return
    const today = new Date().toISOString().split("T")[0]
    const { data } = await supabase
      .from("agreements")
      .select("id, title, end_date")
      .eq("archived", false)
      .gte("end_date", today)
      .order("end_date", { ascending: true })
      .limit(4)
    setUpcoming(data ?? [])
  }

  async function fetchCriticalCustomers() {
    if (!supabase) return
    const today = new Date().toISOString().split("T")[0]

    let critQuery = supabase.from("customers").select("id, name, email")
    if (restrictToOwn && user) critQuery = critQuery.eq("account_manager_id", user.id)
    const { data: customers } = await critQuery
    const { data: agreements } = await supabase.from("agreements").select("customer_id, archived, end_date")

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

  const status = account?.subscription_status
  const showBanner = !authLoading && status && status !== "active"

  function daysLeft(dateString: string | null) {
    if (!dateString) return null
    return Math.ceil((new Date(dateString).getTime() - Date.now()) / 86400000)
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      {/* Abonnement-banner — kun når handling kreves */}
      {showBanner && (
        <div className={`rounded-xl border px-6 py-4 flex items-center justify-between ${
          status === "trialing" ? "bg-blue-50 border-blue-200" :
          status === "past_due" ? "bg-red-50 border-red-200" :
          "bg-gray-50 border-gray-200"
        }`}>
          <div>
            <p className="font-semibold text-gray-900">
              {status === "trialing" && `${daysLeft(account?.trial_end ?? null)} dager igjen av prøveperioden`}
              {status === "past_due" && "Betaling feilet"}
              {status === "canceled" && "Abonnement avsluttet"}
              {status === "incomplete" && "Betaling ikke fullført"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {status === "trialing" && "Start abonnement for å fortsette uten avbrudd"}
              {status === "past_due" && "Oppdater betalingsmetode for å unngå avbrudd"}
              {status === "canceled" && "Aktiver abonnementet på nytt"}
              {status === "incomplete" && "Fullfør kjøpet for å aktivere kontoen"}
            </p>
          </div>
          <div className="shrink-0 ml-6">
            {status === "trialing" && <SubscribeButton label="Start abonnement" mode="checkout" />}
            {status === "past_due" && <SubscribeButton label="Oppdater betaling" mode="portal" />}
            {status === "canceled" && <SubscribeButton label="Start på nytt" mode="checkout" />}
            {status === "incomplete" && <SubscribeButton label="Fullfør betaling" mode="checkout" />}
          </div>
        </div>
      )}

      {/* Sidehode */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oversikt</h1>
          <p className="text-gray-500 mt-1">Kunder, avtaler og aktivitet samlet på ett sted</p>
        </div>
        <div className="flex gap-3">
          <Link href="/customers/new"
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            Ny kunde
          </Link>
          <button
            onClick={() => { resetForm(); setSlideOverOpen(true) }}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            Ny avtale
          </button>
        </div>
      </div>

      {/* Stat-kort */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/customers">
          <StatCard title="Kunder" value={stats.customers}
            icon={<UserGroupIcon className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50" />
        </Link>
        <Link href="/customers?noActive=true">
          <StatCard title="Uten aktive avtaler" value={stats.customersWithoutActive}
            icon={<ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
            bg="bg-red-50" />
        </Link>
        <Link href="/agreements?status=active">
          <StatCard title="Aktive avtaler" value={stats.activeAgreements}
            icon={<CheckCircleIcon className="h-5 w-5 text-green-600" />}
            bg="bg-green-50" />
        </Link>
        <Link href="/agreements?expiresSoon=true">
          <StatCard title="Utløper snart" value={stats.expiringSoon}
            subtitle="Avtaler de neste 30 dagene"
            icon={<ClockIcon className="h-5 w-5 text-amber-500" />}
            bg="bg-amber-50" />
        </Link>
      </div>

      {/* To-kolonne: Kommende avtaler + Kritiske kunder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Kommende avtaler */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Kommende avtaler</h2>
            <Link href="/agreements" className="text-xs text-slate-500 hover:text-slate-800">Se alle →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen kommende avtaler</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-0">
                  <span className="text-sm font-medium text-gray-800">{a.title}</span>
                  <span className="text-xs text-gray-400">{formatDate(a.end_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mest kritiske kunder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Kunder uten aktiv avtale</h2>
            <Link href="/customers?noActive=true" className="text-xs text-slate-500 hover:text-slate-800">Se alle →</Link>
          </div>
          {criticalCustomers.length === 0 ? (
            <p className="text-sm text-gray-400">Alle kunder har aktive avtaler</p>
          ) : (
            <ul className="space-y-2">
              {criticalCustomers.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      {c.neverHadAgreement ? "Aldri hatt avtale" : `Utløpt for ${c.daysSinceEnd} dager siden`}
                    </p>
                  </div>
                  <Link href={`/customers/${c.id}`} className="text-xs text-slate-500 hover:text-slate-800">Åpne →</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      <AgreementSlideOver
        open={slideOverOpen}
        onClose={() => { resetForm(); setSlideOverOpen(false) }}
        editingAgreement={null}
        customers={customersList}
        customerId={customerId}
        setCustomerId={setCustomerId}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newStart={newStart}
        setNewStart={setNewStart}
        newEnd={newEnd}
        setNewEnd={setNewEnd}
        newContactName={newContactName}
        setNewContactName={setNewContactName}
        newContactEmail={newContactEmail}
        setNewContactEmail={setNewContactEmail}
        newContactPhone={newContactPhone}
        setNewContactPhone={setNewContactPhone}
        newSigned={newSigned}
        setNewSigned={setNewSigned}
        newFile={newFile}
        setNewFile={setNewFile}
        removeExistingFile={removeExistingFile}
        setRemoveExistingFile={setRemoveExistingFile}
        onSave={handleSaveAgreement}
      />
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("no-NO", { day: "numeric", month: "short" })
}
