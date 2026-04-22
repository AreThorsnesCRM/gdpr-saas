"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import AgreementSlideOver from "@/app/components/AgreementSlideOver"

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

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null

  const agreementId = searchParams?.get("agreementId") || null

  // -----------------------------
  // SESSION HYDRERING
  // -----------------------------
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    async function waitForSession() {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        setSessionReady(true)
        return
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) setSessionReady(true)
      })

      return () => subscription.unsubscribe()
    }

    waitForSession()
  }, [])

  // -----------------------------
  // STATE
  // -----------------------------
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

  // -----------------------------
  // FETCH FUNCTIONS
  // -----------------------------
  async function fetchCustomer() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("fetchCustomer error:", error)
      return
    }

    if (data) {
      setCustomer(data)
      setName(data.name)
      setEmail(data.email)
      setPhone(data.phone)
    }
  }

  async function fetchNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("fetchNotes error:", error)
      return
    }

    if (data) setNotes(data)
  }

  async function fetchAgreements() {
    const { data, error } = await supabase
      .from("agreements")
      .select("*")
      .eq("customer_id", id)
      .order("start_date", { ascending: true })

    if (error) {
      console.error("fetchAgreements error:", error)
      return
    }

    if (data) setAgreements(data as Agreement[])
  }

  // -----------------------------
  // LOAD DATA WHEN SESSION IS READY
  // -----------------------------
  useEffect(() => {
    if (!sessionReady || !id) return
    fetchCustomer()
    fetchNotes()
    fetchAgreements()
  }, [sessionReady, id])

  // -----------------------------
  // AUTO-OPEN AGREEMENT
  // -----------------------------
  useEffect(() => {
    if (!agreementId) return
    if (agreements.length === 0) return

    const target = agreements.find((a) => a.id === agreementId)
    if (target) {
      handleEditAgreement(target)

      document.getElementById("agreements-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }, [agreements, agreementId])

  // -----------------------------
  // AGREEMENT HELPERS
  // -----------------------------
  function resetAgreementForm() {
    setEditingAgreement(null)
    setNewTitle("")
    setNewStart("")
    setNewEnd("")
    setNewSigned(false)
    setNewContactName("")
    setNewContactEmail("")
    setNewContactPhone("")
    setNewFile(null)
    setRemoveExistingFile(false)
  }

  function openSlideOver() {
    setSlideOverOpen(true)
  }

  function closeSlideOver() {
    resetAgreementForm()
    setSlideOverOpen(false)
  }

  function handleNewAgreement() {
    resetAgreementForm()
    openSlideOver()
  }

  function handleEditAgreement(a: Agreement) {
    setEditingAgreement(a)
    setNewTitle(a.title)
    setNewStart(a.start_date)
    setNewEnd(a.end_date)
    setNewSigned(a.signed)
    setNewContactName(a.contact_name || "")
    setNewContactEmail(a.contact_email || "")
    setNewContactPhone(a.contact_phone || "")
    openSlideOver()
  }

  function getAgreementStatus(a: Agreement) {
    const today = new Date().toISOString().split("T")[0]

    if (a.end_date < today) {
      return { label: "Utløpt", color: "red", emoji: "⛔" }
    }

    if (a.start_date > today) {
      return { label: "Kommende", color: "yellow", emoji: "⏳" }
    }

    return { label: "Aktiv", color: "green", emoji: "✔️" }
  }

  function daysUntil(dateStr: string) {
    const today = new Date()
    const target = new Date(dateStr)
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  function getExpiryBadge(a: Agreement) {
    const days = daysUntil(a.end_date)

    if (days < 0) {
      return {
        text: "Utløpt",
        color: "bg-red-100 text-red-700 border-red-300",
      }
    }

    if (days <= 7) {
      return {
        text: `Utløper om ${days} dager`,
        color: "bg-red-100 text-red-700 border-red-300",
      }
    }

    if (days <= 30) {
      return {
        text: `Utløper om ${days} dager`,
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
      }
    }

    return null
  }

  // -----------------------------
  // AGREEMENT SAVE
  // -----------------------------
  async function uploadAgreementFile(existingUrl: string | null) {
    let file_url = existingUrl || null

    if (removeExistingFile) {
      file_url = null
    }

    if (newFile) {
      const fileExt = newFile.name.split(".").pop()
      const fileName = `${id}/${Date.now()}.${fileExt}`

      const { data: upload, error: uploadError } = await supabase.storage
        .from("agreements")
        .upload(fileName, newFile)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        return file_url
      }

      const { data: urlData } = supabase.storage
        .from("agreements")
        .getPublicUrl(upload.path)

      file_url = urlData.publicUrl
    }

    return file_url
  }

  async function addAgreement() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const file_url = await uploadAgreementFile(null)

    const { error } = await supabase.from("agreements").insert({
      customer_id: id,
      title: newTitle,
      start_date: newStart,
      end_date: newEnd,
      signed: newSigned,
      file_url,
      contact_name: newContactName,
      contact_email: newContactEmail,
      contact_phone: newContactPhone,
      archived: false,
      user_id: user.id,
    })

    if (error) {
      console.error("addAgreement error:", error)
      return
    }

    fetchAgreements()
  }

  async function updateAgreement() {
    if (!editingAgreement) return

    const file_url = await uploadAgreementFile(editingAgreement.file_url)

    const { error } = await supabase
      .from("agreements")
      .update({
        title: newTitle,
        start_date: newStart,
        end_date: newEnd,
        signed: newSigned,
        file_url,
        contact_name: newContactName,
        contact_email: newContactEmail,
        contact_phone: newContactPhone,
      })
      .eq("id", editingAgreement.id)

    if (error) {
      console.error("updateAgreement error:", error)
      return
    }

    fetchAgreements()
  }

  async function handleSaveAgreement() {
    if (editingAgreement) {
      await updateAgreement()
    } else {
      await addAgreement()
    }
    closeSlideOver()
  }

  // -----------------------------
  // ARCHIVE / UNARCHIVE
  // -----------------------------
  async function archiveAgreement(agreementId: string) {
    const { error } = await supabase
      .from("agreements")
      .update({ archived: true })
      .eq("id", agreementId)

    if (error) {
      console.error("archiveAgreement error:", error)
      return
    }

    fetchAgreements()
  }

  async function unarchiveAgreement(agreementId: string) {
    const { error } = await supabase
      .from("agreements")
      .update({ archived: false })
      .eq("id", agreementId)

    if (error) {
      console.error("unarchiveAgreement error:", error)
      return
    }

    fetchAgreements()
  }

  // -----------------------------
  // DELETE CUSTOMER
  // -----------------------------
  async function deleteCustomer() {
    const confirmed = window.confirm("Er du sikker på at du vil slette denne kunden?")
    if (!confirmed) return

    await supabase.from("customers").delete().eq("id", id)
    router.push("/customers")
  }

  async function updateCustomer() {
    const { error } = await supabase
      .from("customers")
      .update({ name, email, phone })
      .eq("id", id)

    if (error) {
      console.error("updateCustomer error:", error)
      return
    }

    fetchCustomer()
  }



  // -----------------------------
  // NOTES
  // -----------------------------
  async function addNote() {
    if (!newNote.trim()) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase.from("notes").insert({
      customer_id: id,
      content: newNote,
      user_id: user.id,
    })

    if (error) {
      console.error("addNote error:", error)
      return
    }

    setNewNote("")
    fetchNotes()
  }

  async function deleteNote(noteId: string) {
    await supabase.from("notes").delete().eq("id", noteId)
    fetchNotes()
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="p-6 space-y-6">
      <Link
        href="/customers"
        className="text-blue-600 underline text-sm mb-2 inline-block"
      >
        ← Tilbake til kunder
      </Link>

      {/* Topp: Kundeinfo + slett */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {customer ? customer.name : "Kunde"}
        </h1>
        <button
          onClick={deleteCustomer}
          className="text-red-600 border border-red-600 px-3 py-1 rounded"
        >
          Slett kunde
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VENSTRE KOLONNE */}
        <div className="space-y-6">
          {/* Kundeinfo */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold">Kundeinformasjon</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                className="border p-2 rounded"
                placeholder="Navn"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="border p-2 rounded"
                placeholder="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="border p-2 rounded"
                placeholder="Telefon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button
              onClick={updateCustomer}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Oppdater kunde
            </button>
          </div>

          {/* Notater */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold">Notater</h2>

            <textarea
              className="border p-2 rounded w-full"
              placeholder="Nytt notat..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />

            <button
              onClick={addNote}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Legg til notat
            </button>

            <ul className="space-y-2">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="border p-2 rounded flex justify-between"
                >
                  <span>{n.content}</span>
                  <button
                    onClick={() => deleteNote(n.id)}
                    className="text-red-600"
                  >
                    Slett
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* HØYRE KOLONNE */}
        <div className="space-y-6">
          {/* Aktive avtaler */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 id="agreements-section" className="text-xl font-semibold">
                Avtaler
              </h2>
              <button
                onClick={handleNewAgreement}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Ny avtale
              </button>
            </div>

            <h3 className="font-semibold">Aktive avtaler</h3>
            <ul className="space-y-2">
              {activeAgreements.map((a) => {
                const status = getAgreementStatus(a)
                const badge = getExpiryBadge(a)

                return (
                  <li
                    key={a.id}
                    className="border p-3 rounded flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong>{a.title}</strong> <span>{status.emoji}</span>
                        {badge && (
                          <span
                            className={`text-xs px-2 py-1 rounded border ${badge.color}`}
                          >
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {a.start_date} – {a.end_date}
                      </div>
                      {a.file_url && (
                        <a
                          href={a.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-sm"
                        >
                          Se avtale (fil)
                        </a>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEditAgreement(a)}
                        className="text-blue-600"
                      >
                        Rediger
                      </button>
                      <button
                        onClick={() => archiveAgreement(a.id)}
                        className="text-yellow-600"
                      >
                        Arkiver
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Arkiverte avtaler */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="font-semibold">Arkiverte avtaler</h3>
            <ul className="space-y-2">
              {archivedAgreements.map((a) => {
                const badge = getExpiryBadge(a)

                return (
                  <li
                    key={a.id}
                    className="border p-3 rounded flex justify-between items-center opacity-70"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong>{a.title}</strong>
                        {badge && (
                          <span
                            className={`text-xs px-2 py-1 rounded border ${badge.color}`}
                          >
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {a.start_date} – {a.end_date}
                      </div>
                      {a.file_url && (
                        <a
                          href={a.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-sm"
                        >
                          Se avtale (fil)
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => unarchiveAgreement(a.id)}
                      className="text-green-600"
                    >
                      Gjenopprett
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* SLIDE-OVER */}
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
