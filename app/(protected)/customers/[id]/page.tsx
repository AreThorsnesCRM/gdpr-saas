"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import { ChevronLeftIcon, TrashIcon } from "@heroicons/react/24/outline"
import { useTranslations, useLocale } from "next-intl"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  org_nummer: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  website: string | null
  country: string | null
  account_manager_id: string | null
}

interface Note {
  id: string
  content: string
  created_at: string
  user_id: string
  type: string
}

interface Agreement {
  id: string
  title: string
  start_date: string
  end_date: string
  signed: boolean
  file_url: string | null
  archived: boolean
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  signing_status: string | null
  signing_url: string | null
  signer_name: string | null
  signer_email: string | null
  signed_file_url: string | null
}

interface TeamMember {
  user_id: string
  full_name: string
}

interface CustomerPageProps {
  params: Promise<{ id: string }>
}

export default function CustomerPage(props: CustomerPageProps) {
  const router = useRouter()
  const params = use(props.params)
  const id = params.id
  const { user, account } = useAuth()
  const t = useTranslations("customerDetail")
  const tc = useTranslations("common")
  const tad = useTranslations("agreementDetail")
  const to = useTranslations("onboarding")
  const locale = useLocale()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [orgNummer, setOrgNummer] = useState("")
  const [address, setAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [city, setCity] = useState("")
  const [website, setWebsite] = useState("")
  const [country, setCountry] = useState("")
  const [accountManagerId, setAccountManagerId] = useState("")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [saved, setSaved] = useState(false)

  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [newNoteType, setNewNoteType] = useState("note")

  const [agreements, setAgreements] = useState<Agreement[]>([])
  const activeAgreements = agreements.filter((a) => !a.archived)
  const archivedAgreements = agreements.filter((a) => a.archived)

  const [renewModal, setRenewModal] = useState<Agreement | null>(null)
  const [renewTitle, setRenewTitle] = useState("")
  const [renewStart, setRenewStart] = useState("")
  const [renewEnd, setRenewEnd] = useState("")
  const [renewLoading, setRenewLoading] = useState(false)

  // Quick create modal
  const [quickModalOpen, setQuickModalOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickStart, setQuickStart] = useState("")
  const [quickEnd, setQuickEnd] = useState("")
  const [quickSaving, setQuickSaving] = useState(false)

  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState("")
  const [summaryLoading, setSummaryLoading] = useState(false)

  const activityTypes = [
    { value: "note",    label: t("activityTypeNote"),    icon: "📝", bg: "bg-gray-100",   badge: "bg-gray-100 text-gray-600" },
    { value: "call",    label: t("activityTypeCall"),    icon: "📞", bg: "bg-green-50",   badge: "bg-green-50 text-green-700" },
    { value: "email",   label: t("activityTypeEmail"),   icon: "✉️",  bg: "bg-blue-50",    badge: "bg-blue-50 text-blue-700" },
    { value: "meeting", label: t("activityTypeMeeting"), icon: "👥", bg: "bg-purple-50",  badge: "bg-purple-50 text-purple-700" },
  ]

  useEffect(() => {
    if (!user || !id) return
    fetchCustomer()
    fetchNotes()
    fetchAgreements()
  }, [user, id])

  useEffect(() => {
    fetch("/api/account/members")
      .then((r) => r.json())
      .then(({ members }) => { if (members) setTeamMembers(members) })
  }, [])

  async function fetchCustomer() {
    if (!supabase) return
    const { data } = await supabase.from("customers").select("*").eq("id", id).single()
    if (!data) {
      router.push("/customers")
      return
    }
    setCustomer(data)
    setName(data.name ?? "")
    setEmail(data.email ?? "")
    setPhone(data.phone ?? "")
    setOrgNummer(data.org_nummer ?? "")
    setAddress(data.address ?? "")
    setPostalCode(data.postal_code ?? "")
    setCity(data.city ?? "")
    setWebsite(data.website ?? "")
    setCountry(data.country ?? "")
    setAccountManagerId(data.account_manager_id ?? "")
  }

  async function fetchNotes() {
    if (!supabase) return
    const { data } = await supabase.from("notes").select("*").eq("customer_id", id).order("created_at", { ascending: false })
    if (data) setNotes(data)
  }

  async function fetchAgreements() {
    if (!supabase) return
    const { data } = await supabase.from("agreements").select("*").eq("customer_id", id).order("start_date", { ascending: true })
    if (data) setAgreements(data as Agreement[])
  }

  async function updateCustomer() {
    if (!supabase) return
    await supabase.from("customers").update({
      name,
      email: email || null,
      phone: phone || null,
      org_nummer: orgNummer || null,
      address: address || null,
      postal_code: postalCode || null,
      city: city || null,
      website: website || null,
      country: country || null,
      account_manager_id: accountManagerId || null,
    }).eq("id", id)
    fetchCustomer()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function deleteCustomer() {
    if (!supabase || !window.confirm(t("deleteConfirm"))) return
    await supabase.from("customers").delete().eq("id", id)
    router.push("/customers")
  }

  async function handleFetchSummary() {
    setSummaryOpen(true)
    setSummary("")
    setSummaryLoading(true)
    const res = await fetch(`/api/ai/customer-summary?customerId=${id}`)
    const data = await res.json()
    setSummary(data.summary ?? "Kunne ikke generere sammendrag.")
    setSummaryLoading(false)
  }

  async function addNote() {
    if (!newNote.trim() || !supabase) return
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    await supabase.from("notes").insert({
      customer_id: id,
      content: newNote,
      user_id: u.id,
      type: newNoteType,
    })
    setNewNote("")
    fetchNotes()
  }

  async function deleteNote(noteId: string) {
    if (!supabase) return
    await supabase.from("notes").delete().eq("id", noteId)
    fetchNotes()
  }

  async function handleCreateQuickAgreement() {
    if (!supabase || !user) return
    setQuickSaving(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const { data: newAgreement } = await supabase.from("agreements").insert({
        customer_id: id,
        user_id: u.id,
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

  function handleRenewAgreement(a: Agreement) {
    const durationDays = Math.round(
      (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / 86400000
    )
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const newEndDate = new Date(today.getTime() + durationDays * 86400000)
    const newEndStr = newEndDate.toISOString().slice(0, 10)
    const oldYear = String(new Date(a.end_date).getFullYear())
    const newYear = String(newEndDate.getFullYear())
    const updatedTitle = a.title.replace(oldYear, newYear)
    setRenewTitle(updatedTitle)
    setRenewStart(todayStr)
    setRenewEnd(newEndStr)
    setRenewModal(a)
  }

  async function handleConfirmRenewal() {
    if (!renewModal || !supabase) return
    setRenewLoading(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const { data: newAgreement } = await supabase.from("agreements").insert({
        customer_id: id,
        title: renewTitle,
        start_date: renewStart,
        end_date: renewEnd,
        signed: false,
        file_url: renewModal.file_url ?? null,
        contact_name: renewModal.contact_name,
        contact_email: renewModal.contact_email,
        contact_phone: renewModal.contact_phone,
        archived: false,
        user_id: u.id,
      }).select().single()
      setRenewModal(null)
      if (newAgreement) router.push(`/agreements/${newAgreement.id}`)
    } finally {
      setRenewLoading(false)
    }
  }

  async function archiveAgreement(agreementId: string) {
    if (!supabase) return
    await supabase.from("agreements").update({ archived: true }).eq("id", agreementId)
    fetchAgreements()
  }

  async function unarchiveAgreement(agreementId: string) {
    if (!supabase) return
    await supabase.from("agreements").update({ archived: false }).eq("id", agreementId)
    fetchAgreements()
  }

  function getExpiryBadge(a: Agreement) {
    if (!a.end_date) return null
    const days = Math.ceil((new Date(a.end_date).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { text: t("badgeExpired"),                           color: "bg-red-50 text-red-600 ring-red-200" }
    if (days <= 7)  return { text: t("badgeExpiresDays", { days }),             color: "bg-red-50 text-red-600 ring-red-200" }
    if (days <= 30) return { text: t("badgeExpiresDays", { days }),             color: "bg-amber-50 text-amber-700 ring-amber-200" }
    return null
  }

  const dateLocale = locale === "en" ? "en-GB" : "no-NO"

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 1)   return t("timeJustNow")
    if (mins < 60)  return t("timeMinutes", { mins })
    if (hours < 24) return t("timeHours", { hours })
    if (days < 7)   return t("timeDays", { days })
    return new Date(dateStr).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

  return (
    <div className="p-4 md:p-8 max-w-5xl space-y-6">

      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        {t("backToCustomers")}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{customer?.name ?? ""}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {account?.ai_assistant_enabled && (
            <button
              onClick={handleFetchSummary}
              className="flex items-center gap-1.5 text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition"
            >
              <span className="text-amber-400">✦</span>
              Kundeoppsummering
            </button>
          )}
          <button
            onClick={deleteCustomer}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            {t("deleteCustomer")}
          </button>
        </div>
      </div>

      {summaryOpen && account?.ai_assistant_enabled && (
        <div className="bg-slate-800 text-white rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">✦</span>
              <p className="text-sm font-semibold">Kundeoppsummering</p>
            </div>
            <button onClick={() => setSummaryOpen(false)} className="text-white/50 hover:text-white text-lg leading-none">×</button>
          </div>
          {summaryLoading ? (
            <div className="flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <p className="text-sm text-white/90 leading-relaxed">{summary}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* VENSTRE KOLONNE */}
        <div className="space-y-6">

          {/* Kundeinformasjon */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">{t("infoTitle")}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelName")}</label>
                <input className={inputClass} placeholder={t("labelName")} value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelEmail")}</label>
                  <input className={inputClass} placeholder={t("labelEmail")} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelPhone")}</label>
                  <input className={inputClass} placeholder={t("labelPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelOrgNr")}</label>
                  <input className={inputClass} placeholder={t("placeholderOrgNr")} value={orgNummer} onChange={(e) => setOrgNummer(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelWebsite")}</label>
                  <input className={inputClass} placeholder={t("placeholderWebsite")} value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelAddress")}</label>
                <input className={inputClass} placeholder={t("placeholderAddress")} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelPostalCode")}</label>
                  <input className={inputClass} placeholder={t("placeholderPostalCode")} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelCity")}</label>
                  <input className={inputClass} placeholder={t("placeholderCity")} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelCountry")}</label>
                <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">{t("placeholderCountry")}</option>
                  {(["NO","SE","DK","FI","DE","FR","GB","NL","BE","AT","CH","ES","PT","IT","PL","US","CA","BR","MX","OTHER"] as const).map((code) => (
                    <option key={code} value={code}>{to(`countries.${code}`).replace(/^[\u{1F1E0}-\u{1F1FF}\u{1F30D}-\u{1F315}\s]+/u, "").trim()}</option>
                  ))}
                </select>
              </div>

              {teamMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelManager")}</label>
                  <select
                    className={inputClass}
                    value={accountManagerId}
                    onChange={(e) => setAccountManagerId(e.target.value)}
                  >
                    <option value="">{t("noManager")}</option>
                    {teamMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={updateCustomer}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? "bg-green-600 text-white"
                  : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              {saved ? tc("saved") : tc("saveChanges")}
            </button>
          </div>

          {/* Aktivitetslogg */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">{t("activityTitle")}</h2>

            <div className="flex gap-2 flex-wrap">
              {activityTypes.map((at) => (
                <button
                  key={at.value}
                  onClick={() => setNewNoteType(at.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    newNoteType === at.value
                      ? "bg-slate-800 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{at.icon}</span>
                  {at.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white resize-none"
                rows={2}
                placeholder={t("activityPlaceholder", { type: activityTypes.find(at => at.value === newNoteType)?.label.toLowerCase() ?? "" })}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote() }}
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                {t("activityAdd")}
              </button>
            </div>

            {notes.length > 0 && (
              <ul className="space-y-0 pt-2">
                {notes.map((n, i) => {
                  const typeInfo = activityTypes.find(at => at.value === n.type) ?? activityTypes[0]
                  const authorName = teamMembers.find(m => m.user_id === n.user_id)?.full_name ?? t("activityUnknownAuthor")
                  const isLast = i === notes.length - 1
                  return (
                    <li key={n.id} className="group relative flex gap-3">
                      {!isLast && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-100" />
                      )}
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${typeInfo.bg}`}>
                        {typeInfo.icon}
                      </div>
                      <div className="flex-1 pb-4 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.badge}`}>
                              {typeInfo.label}
                            </span>
                            <span className="text-xs text-gray-400">{authorName}</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                          </div>
                          <button
                            onClick={() => deleteNote(n.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                            title={t("deleteActivityTitle")}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 leading-relaxed">{n.content}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            {notes.length === 0 && (
              <p className="text-sm text-gray-400">{t("activityEmpty")}</p>
            )}
          </div>
        </div>

        {/* HØYRE KOLONNE */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="agreements-section" className="text-base font-semibold text-gray-900">{t("agreementsTitle")}</h2>
              <button
                onClick={() => { setQuickTitle(""); setQuickStart(""); setQuickEnd(""); setQuickModalOpen(true) }}
                className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                {t("newAgreement")}
              </button>
            </div>

            {activeAgreements.length === 0 ? (
              <p className="text-sm text-gray-400">{t("noActiveAgreements")}</p>
            ) : (
              <ul>
                {activeAgreements.map((a) => {
                  const badge = getExpiryBadge(a)
                  return (
                    <li key={a.id} className="border-t border-gray-100 first:border-0 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/agreements/${a.id}`} className="min-w-0 flex-1 group">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 text-sm group-hover:text-slate-600 transition-colors">{a.title}</p>
                            {badge && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${badge.color}`}>
                                {badge.text}
                              </span>
                            )}
                            {a.signing_status === "signed" && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">Signert</span>
                            )}
                            {a.signing_status === "pending" && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">Venter</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.start_date)} – {formatDate(a.end_date)}</p>
                        </Link>
                        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
                          {badge && (
                            <button onClick={() => handleRenewAgreement(a)} className="text-blue-500 hover:text-blue-700 font-medium transition-colors">{t("renewButton")}</button>
                          )}
                          <button onClick={() => archiveAgreement(a.id)} className="hover:text-red-500 transition-colors">{t("archive")}</button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {archivedAgreements.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{t("archivedLabel")}</p>
                <ul>
                  {archivedAgreements.map((a) => (
                    <li key={a.id} className="group border-t border-gray-100 first:border-0 py-3 opacity-50 hover:opacity-100 transition-opacity">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/agreements/${a.id}`} className="min-w-0 flex-1 group">
                          <p className="font-medium text-gray-700 text-sm group-hover:text-slate-600 transition-colors">{a.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(a.start_date)} – {formatDate(a.end_date)}
                          </p>
                        </Link>
                        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                          <button onClick={() => unarchiveAgreement(a.id)} className="hover:text-gray-700 transition-colors">{t("restore")}</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick create agreement modal */}
      {quickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">{t("newAgreement")}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{tad("quickTitleLabel")}</label>
                <input className={inputClass} value={quickTitle} onChange={e => setQuickTitle(e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{tad("quickStartLabel")}</label>
                  <input type="date" className={inputClass} value={quickStart} onChange={e => setQuickStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{tad("quickEndLabel")}</label>
                  <input type="date" className={inputClass} value={quickEnd} onChange={e => setQuickEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-1">
              <button onClick={() => setQuickModalOpen(false)} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">{tc("cancel")}</button>
              <button
                onClick={handleCreateQuickAgreement}
                disabled={quickSaving || !quickTitle || !quickStart || !quickEnd}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {quickSaving ? tad("creating") : tad("createButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew modal */}
      {renewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("renewModalTitle")}</h2>
              <p className="text-sm text-gray-500 mt-1">{t("renewModalInfo")}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelName")}</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={renewTitle}
                  onChange={(e) => setRenewTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("renewStartLabel")}</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={renewStart}
                    onChange={(e) => setRenewStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("renewEndLabel")}</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={renewEnd}
                    onChange={(e) => setRenewEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-1">
              <button
                onClick={() => setRenewModal(null)}
                className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleConfirmRenewal}
                disabled={renewLoading || !renewTitle || !renewStart || !renewEnd}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {renewLoading ? t("renewCreating") : t("renewConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
