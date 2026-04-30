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
}

interface Note {
  id: string
  content: string
  created_at: string
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

interface CustomerPageProps {
  params: Promise<{ id: string }>
}

export default function CustomerPage(props: CustomerPageProps) {
  const router = useRouter()
  const params = use(props.params)
  const id = params.id
  const { user, profile } = useAuth()

  const agreementId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("agreementId")
      : null

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")

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
      setName(data.name)
      setEmail(data.email)
      setPhone(data.phone)
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
    await supabase.from("customers").update({ name, email, phone }).eq("id", id)
    fetchCustomer()
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
    await supabase.from("notes").insert({ customer_id: id, content: newNote, user_id: u.id })
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
    generateAgreementPDF(agreement, customer, profile)
  }

  async function uploadAgreementFile(existingUrl: string | null) {
    if (!supabase) return existingUrl
    let file_url = removeExistingFile ? null : existingUrl
    if (newFile) {
      const fileExt = newFile.name.split(".").pop()
      const fileName = `${id}/${Date.now()}.${fileExt}`
      const { data: upload, error } = await supabase.storage.from("agreements").upload(fileName, newFile)
      if (!error && upload) {
        const { data: urlData } = supabase.storage.from("agreements").getPublicUrl(upload.path)
        file_url = urlData.publicUrl
      }
    }
    return file_url
  }

  async function handleSaveAgreement() {
    if (!supabase) return
    if (editingAgreement) {
      const file_url = await uploadAgreementFile(editingAgreement.file_url)
      await supabase.from("agreements").update({
        title: newTitle, start_date: newStart, end_date: newEnd, signed: newSigned,
        file_url, contact_name: newContactName, contact_email: newContactEmail, contact_phone: newContactPhone,
      }).eq("id", editingAgreement.id)
    } else {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const file_url = await uploadAgreementFile(null)
      await supabase.from("agreements").insert({
        customer_id: id, title: newTitle, start_date: newStart, end_date: newEnd,
        signed: newSigned, file_url, contact_name: newContactName,
        contact_email: newContactEmail, contact_phone: newContactPhone,
        archived: false, user_id: u.id,
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
    if (days < 0)   return { text: "Utløpt",                      color: "bg-red-50 text-red-600 ring-red-200" }
    if (days <= 7)  return { text: `Utløper om ${days} dager`,    color: "bg-red-50 text-red-600 ring-red-200" }
    if (days <= 30) return { text: `Utløper om ${days} dager`,    color: "bg-amber-50 text-amber-700 ring-amber-200" }
    return null
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })
  }

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
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  placeholder="Navn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">E-post</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  placeholder="E-post"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  placeholder="Telefon"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={updateCustomer}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Lagre endringer
            </button>
          </div>

          {/* Notater */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Notater</h2>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white resize-none"
              rows={3}
              placeholder="Nytt notat..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button
              onClick={addNote}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Legg til notat
            </button>
            {notes.length > 0 && (
              <ul className="pt-1">
                {notes.map((n) => (
                  <li key={n.id} className="group flex items-start justify-between gap-3 py-2.5 border-t border-gray-100 first:border-0">
                    <p className="text-sm text-gray-700 flex-1">{n.content}</p>
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100 mt-0.5"
                      title="Slett notat"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
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
                    <li key={a.id} className="group border-t border-gray-100 first:border-0 py-3">
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
                          {a.file_url && (
                            <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-slate-500 hover:text-slate-800 underline mt-0.5 inline-block">
                              Se fil
                            </a>
                          )}
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
        onSave={handleSaveAgreement}
      />
    </div>
  )
}
