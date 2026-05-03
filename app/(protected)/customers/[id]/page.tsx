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

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  org_nummer: string | null
  address: string | null
  postal_code: string | null
  city: string | null
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
  const { user, profile, account } = useAuth()

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

  const [newTitle, setNewTitle] = useState("")
  const [newStart, setNewStart] = useState("")
  const [newEnd, setNewEnd] = useState("")
  const [newSigned, setNewSigned] = useState(false)
  const [newContactName, setNewContactName] = useState("")
  const [newContactEmail, setNewContactEmail] = useState("")
  const [newContactPhone, setNewContactPhone] = useState("")
  const [newFile, setNewFile] = useState<File | null>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)

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
      account_manager_id: accountManagerId || null,
    }).eq("id", id)
    fetchCustomer()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function deleteCustomer() {
    if (!supabase || !window.confirm("Er du sikker på at du vil slette denne kunden?")) return
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
    if (days < 0)   return { text: "Utløpt",                   color: "bg-red-50 text-red-600 ring-red-200" }
    if (days <= 7)  return { text: `Utløper om ${days} dager`, color: "bg-red-50 text-red-600 ring-red-200" }
    if (days <= 30) return { text: `Utløper om ${days} dager`, color: "bg-amber-50 text-amber-700 ring-amber-200" }
    return null
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

  return (
    <div className="p-8 max-w-5xl space-y-6">

      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        Kunder
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{customer?.name ?? "Kunde"}</h1>
        <button
          onClick={deleteCustomer}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
          Slett kunde
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* VENSTRE KOLONNE */}
        <div className="space-y-6">

          {/* Kundeinformasjon */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Kundeinformasjon</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Navn</label>
                <input className={inputClass} placeholder="Navn" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">E-post</label>
                  <input className={inputClass} placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                  <input className={inputClass} placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Org.nummer</label>
                <input className={inputClass} placeholder="F.eks. 123456789 eller GB123456" value={orgNummer} onChange={(e) => setOrgNummer(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Adresse</label>
                <input className={inputClass} placeholder="Gateadresse" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Postnummer</label>
                  <input className={inputClass} placeholder="0000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sted</label>
                  <input className={inputClass} placeholder="By" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              </div>

              {teamMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kundeansvarlig</label>
                  <select
                    className={inputClass}
                    value={accountManagerId}
                    onChange={(e) => setAccountManagerId(e.target.value)}
                  >
                    <option value="">Ingen ansvarlig valgt</option>
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
              {saved ? "Lagret ✓" : "Lagre endringer"}
            </button>
          </div>

          {/* Aktivitetslogg */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Aktivitet</h2>

            {/* Type-velger */}
            <div className="flex gap-2 flex-wrap">
              {activityTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setNewNoteType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    newNoteType === t.value
                      ? "bg-slate-800 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="space-y-2">
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white resize-none"
                rows={2}
                placeholder={`Legg til ${activityTypes.find(t => t.value === newNoteType)?.label.toLowerCase() ?? "notat"}...`}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote() }}
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Legg til
              </button>
            </div>

            {/* Tidslinje */}
            {notes.length > 0 && (
              <ul className="space-y-0 pt-2">
                {notes.map((n, i) => {
                  const typeInfo = activityTypes.find(t => t.value === n.type) ?? activityTypes[0]
                  const authorName = teamMembers.find(m => m.user_id === n.user_id)?.full_name ?? "Ukjent"
                  const isLast = i === notes.length - 1
                  return (
                    <li key={n.id} className="group relative flex gap-3">
                      {/* Vertikal linje */}
                      {!isLast && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-100" />
                      )}
                      {/* Ikon-sirkel */}
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${typeInfo.bg}`}>
                        {typeInfo.icon}
                      </div>
                      {/* Innhold */}
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
                            title="Slett"
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
              <p className="text-sm text-gray-400">Ingen aktivitet registrert ennå.</p>
            )}
          </div>
        </div>

        {/* HØYRE KOLONNE */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="agreements-section" className="text-base font-semibold text-gray-900">Avtaler</h2>
              <button
                onClick={handleNewAgreement}
                className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                Ny avtale
              </button>
            </div>

            {activeAgreements.length === 0 ? (
              <p className="text-sm text-gray-400">Ingen aktive avtaler</p>
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
                          <button onClick={() => handleGeneratePDF(a)} className="hover:text-gray-700 transition-colors">PDF</button>
                          <button onClick={() => handleEditAgreement(a)} className="hover:text-gray-700 transition-colors">Rediger</button>
                          <button onClick={() => archiveAgreement(a.id)} className="hover:text-red-500 transition-colors">Arkiver</button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {archivedAgreements.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Arkivert</p>
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
                          <button onClick={() => handleGeneratePDF(a)} className="hover:text-gray-700 transition-colors">PDF</button>
                          <button onClick={() => unarchiveAgreement(a.id)} className="hover:text-gray-700 transition-colors">Gjenopprett</button>
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

const activityTypes = [
  { value: "note",    label: "Notat",    icon: "📝", bg: "bg-gray-100",   badge: "bg-gray-100 text-gray-600" },
  { value: "call",    label: "Samtale",  icon: "📞", bg: "bg-green-50",   badge: "bg-green-50 text-green-700" },
  { value: "email",   label: "E-post",   icon: "✉️",  bg: "bg-blue-50",    badge: "bg-blue-50 text-blue-700" },
  { value: "meeting", label: "Møte",     icon: "👥", bg: "bg-purple-50",  badge: "bg-purple-50 text-purple-700" },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return "nå nettopp"
  if (mins < 60)  return `${mins}m siden`
  if (hours < 24) return `${hours}t siden`
  if (days < 7)   return `${days}d siden`
  return new Date(dateStr).toLocaleDateString("no-NO", { day: "numeric", month: "short" })
}
