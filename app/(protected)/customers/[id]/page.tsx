"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import AgreementSlideOver from "@/app/components/AgreementSlideOver"
import { generateAgreementPDF } from "@/lib/pdfGenerator"
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

type SigningModalState =
  | { step: "form"; agreement: Agreement }
  | { step: "link"; agreement: Agreement; signatureUrl: string }
  | null

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
  const { user, profile, account } = useAuth()
  const t = useTranslations("customerDetail")
  const tc = useTranslations("common")
  const locale = useLocale()

  const agreementId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("agreementId")
      : null

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [orgNummer, setOrgNummer] = useState("")
  const [address, setAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [city, setCity] = useState("")
  const [website, setWebsite] = useState("")
  const [accountManagerId, setAccountManagerId] = useState("")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [saved, setSaved] = useState(false)

  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [newNoteType, setNewNoteType] = useState("note")

  const [agreements, setAgreements] = useState<Agreement[]>([])
  const activeAgreements = agreements.filter((a) => !a.archived)
  const archivedAgreements = agreements.filter((a) => a.archived)

  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null)

  const [signingModal, setSigningModal] = useState<SigningModalState>(null)
  const [signerName, setSignerName] = useState("")
  const [signerEmail, setSignerEmail] = useState("")
  const [signingLoading, setSigningLoading] = useState(false)
  const [signingError, setSigningError] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)

  const [newTitle, setNewTitle] = useState("")
  const [newStart, setNewStart] = useState("")
  const [newEnd, setNewEnd] = useState("")
  const [newSigned, setNewSigned] = useState(false)
  const [newContactName, setNewContactName] = useState("")
  const [newContactEmail, setNewContactEmail] = useState("")
  const [newContactPhone, setNewContactPhone] = useState("")
  const [newFile, setNewFile] = useState<File | null>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)

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

  useEffect(() => {
    if (!agreementId || agreements.length === 0) return
    const target = agreements.find((a) => a.id === agreementId)
    if (target) {
      handleEditAgreement(target)
      document.getElementById("agreements-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [agreements, agreementId])

  async function fetchCustomer() {
    if (!supabase) return
    const { data } = await supabase.from("customers").select("*").eq("id", id).single()
    if (data) {
      setCustomer(data)
      setName(data.name ?? "")
      setEmail(data.email ?? "")
      setPhone(data.phone ?? "")
      setOrgNummer(data.org_nummer ?? "")
      setAddress(data.address ?? "")
      setPostalCode(data.postal_code ?? "")
      setCity(data.city ?? "")
      setWebsite(data.website ?? "")
      setAccountManagerId(data.account_manager_id ?? "")
    }
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

  function resetAgreementForm() {
    setEditingAgreement(null)
    setNewTitle(""); setNewStart(""); setNewEnd("")
    setNewSigned(false)
    setNewContactName(""); setNewContactEmail(""); setNewContactPhone("")
    setNewFile(null); setRemoveExistingFile(false)
  }

  function handleNewAgreement() { resetAgreementForm(); setSlideOverOpen(true) }
  function closeSlideOver() { resetAgreementForm(); setSlideOverOpen(false) }

  function handleEditAgreement(a: Agreement) {
    setEditingAgreement(a)
    setNewTitle(a.title); setNewStart(a.start_date); setNewEnd(a.end_date)
    setNewSigned(a.signed)
    setNewContactName(a.contact_name ?? "")
    setNewContactEmail(a.contact_email ?? "")
    setNewContactPhone(a.contact_phone ?? "")
    setSlideOverOpen(true)
  }

  function handleGeneratePDF(agreement: Agreement) {
    if (agreement.file_url) {
      window.open(agreement.file_url, "_blank")
    } else {
      generateAgreementPDF(agreement, customer, profile)
    }
  }

  async function uploadAgreementFile(existingUrl: string | null, fileOverride?: File | null) {
    if (!supabase) return existingUrl
    let file_url = removeExistingFile ? null : existingUrl
    const file = fileOverride ?? newFile
    if (file) {
      const fileExt = file.name.split(".").pop()
      const fileName = `${id}/${Date.now()}.${fileExt}`
      const { data: upload, error } = await supabase.storage.from("agreements").upload(fileName, file)
      if (!error && upload) {
        const { data: urlData } = supabase.storage.from("agreements").getPublicUrl(upload.path)
        file_url = urlData.publicUrl
      }
    }
    return file_url
  }

  async function handleSaveAgreement(opts?: { generatedFile?: File; content?: string; templateId?: string }) {
    if (!supabase) return
    const fileToUpload = opts?.generatedFile ?? newFile
    if (editingAgreement) {
      const file_url = await uploadAgreementFile(editingAgreement.file_url, fileToUpload)
      await supabase.from("agreements").update({
        title: newTitle, start_date: newStart, end_date: newEnd, signed: newSigned,
        file_url, contact_name: newContactName, contact_email: newContactEmail, contact_phone: newContactPhone,
      }).eq("id", editingAgreement.id)
    } else {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const file_url = await uploadAgreementFile(null, fileToUpload)
      await supabase.from("agreements").insert({
        customer_id: id, title: newTitle, start_date: newStart, end_date: newEnd,
        signed: newSigned, file_url, contact_name: newContactName,
        contact_email: newContactEmail, contact_phone: newContactPhone,
        archived: false, user_id: u.id,
        ...(opts?.content ? { content: opts.content } : {}),
        ...(opts?.templateId ? { template_id: opts.templateId } : {}),
      })
    }
    fetchAgreements()
    closeSlideOver()
  }

  function openSigningModal(a: Agreement) {
    setSignerName(a.signer_name ?? a.contact_name ?? "")
    setSignerEmail(a.signer_email ?? a.contact_email ?? "")
    setSigningError("")
    setSigningModal({ step: "form", agreement: a })
  }

  async function handleConfirmSigning() {
    if (!signingModal || signingModal.step !== "form") return
    setSigningLoading(true)
    setSigningError("")
    try {
      const res = await fetch(`/api/agreements/${signingModal.agreement.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signerEmail }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSigningModal({ step: "link", agreement: signingModal.agreement, signatureUrl: json.signatureUrl })
      fetchAgreements()
    } catch {
      setSigningError(t("signingError"))
    } finally {
      setSigningLoading(false)
    }
  }

  async function handleCopyLink(url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
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
    <div className="p-8 max-w-5xl space-y-6">

      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        {t("backToCustomers")}
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{customer?.name ?? ""}</h1>
        <button
          onClick={deleteCustomer}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
          {t("deleteCustomer")}
        </button>
      </div>

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelEmail")}</label>
                  <input className={inputClass} placeholder={t("labelEmail")} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelPhone")}</label>
                  <input className={inputClass} placeholder={t("labelPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelPostalCode")}</label>
                  <input className={inputClass} placeholder={t("placeholderPostalCode")} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelCity")}</label>
                  <input className={inputClass} placeholder={t("placeholderCity")} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
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
                onClick={handleNewAgreement}
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
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 text-sm">{a.title}</p>
                            {badge && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${badge.color}`}>
                                {badge.text}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(a.start_date)} – {formatDate(a.end_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                          {a.signing_status === "signed" ? (
                            <a href={a.signed_file_url ?? "#"} target="_blank" rel="noopener noreferrer"
                              className="text-green-600 font-medium hover:text-green-700 transition-colors">
                              {t("signingSigned")} ↗
                            </a>
                          ) : a.signing_status === "pending" ? (
                            <span className="text-amber-500 font-medium">{t("signingPending")}</span>
                          ) : a.file_url ? (
                            <button onClick={() => openSigningModal(a)} className="hover:text-gray-700 transition-colors">{t("signingButton")}</button>
                          ) : (
                            <span className="text-gray-300" title={t("signingNoPDF")}>{t("signingButton")}</span>
                          )}
                          <button onClick={() => a.signed_file_url ? window.open(a.signed_file_url, "_blank") : handleGeneratePDF(a)} className="hover:text-gray-700 transition-colors">{t("pdf")}</button>
                          <button onClick={() => handleEditAgreement(a)} className="hover:text-gray-700 transition-colors">{t("edit")}</button>
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
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-700 text-sm">{a.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(a.start_date)} – {formatDate(a.end_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                          <button onClick={() => handleGeneratePDF(a)} className="hover:text-gray-700 transition-colors">{t("pdf")}</button>
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

      {signingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              {signingModal.step === "form" ? t("signingModalTitle") : t("signingLinkReady")}
            </h2>

            {signingModal.step === "form" ? (
              <>
                <p className="text-sm text-gray-500">{t("signingModalInfo")}</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("signingModalNameLabel")}</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("signingModalEmailLabel")}</label>
                    <input
                      type="email"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                    />
                  </div>
                </div>
                {signingError && <p className="text-sm text-red-600">{signingError}</p>}
                <div className="flex justify-between pt-1">
                  <button onClick={() => setSigningModal(null)} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                    {tc("cancel")}
                  </button>
                  <button
                    onClick={handleConfirmSigning}
                    disabled={signingLoading}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    {signingLoading ? t("signingModalSending") : t("signingModalSend")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">{t("signingLinkInfo")}</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 break-all font-mono">
                  {signingModal.signatureUrl}
                </div>
                <div className="flex justify-between pt-1">
                  <button onClick={() => setSigningModal(null)} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                    {tc("close")}
                  </button>
                  <button
                    onClick={() => handleCopyLink(signingModal.signatureUrl)}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    {copiedLink ? t("signingLinkCopied") : t("signingCopyLink")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <AgreementSlideOver
        open={slideOverOpen}
        onClose={closeSlideOver}
        editingAgreement={editingAgreement}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newStart={newStart}
        setNewStart={setNewStart}
        newEnd={newEnd}
        setNewEnd={setNewEnd}
        newSigned={newSigned}
        setNewSigned={setNewSigned}
        newContactName={newContactName}
        setNewContactName={setNewContactName}
        newContactEmail={newContactEmail}
        setNewContactEmail={setNewContactEmail}
        newContactPhone={newContactPhone}
        setNewContactPhone={setNewContactPhone}
        newFile={newFile}
        setNewFile={setNewFile}
        removeExistingFile={removeExistingFile}
        setRemoveExistingFile={setRemoveExistingFile}
        mergeData={{
          kunde_navn: customer?.name,
          org_nummer: orgNummer || undefined,
          firma_navn: account?.name,
        }}
        onSave={handleSaveAgreement}
      />
    </div>
  )
}
