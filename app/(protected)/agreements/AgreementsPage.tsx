"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import AgreementSlideOver from "@/app/components/AgreementSlideOver"

type Agreement = {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  archived: boolean
  customer_id: string
  customers: { name: string; account_manager_id: string | null }
}

type Customer = { id: string; name: string }

type Filter = "all" | "active" | "expired" | "upcoming" | "expiresSoon" | "archived"

const filterOptions: { id: Filter; label: string }[] = [
  { id: "all",         label: "Alle" },
  { id: "active",      label: "Aktive" },
  { id: "expiresSoon", label: "Utløper snart" },
  { id: "upcoming",    label: "Kommende" },
  { id: "expired",     label: "Utløpte" },
  { id: "archived",    label: "Arkiverte" },
]

export default function AgreementsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, account, restrictToOwn } = useAuth()

  const [filter, setFilter] = useState<Filter>("all")
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  // Slide-over state
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [selectedCustomerOrg, setSelectedCustomerOrg] = useState<string | null>(null)
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
    supabase
      .from("customers")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCustomers(data ?? []))
  }, [user])

  useEffect(() => {
    if (!customerId || !supabase) { setSelectedCustomerOrg(null); return }
    supabase.from("customers").select("org_nummer").eq("id", customerId).single()
      .then(({ data }) => setSelectedCustomerOrg(data?.org_nummer ?? null))
  }, [customerId])

  async function fetchAgreements() {
    if (!supabase) return
    setLoading(true)

    let query = supabase
      .from("agreements")
      .select("*, customers!inner(name, account_manager_id)")
      .order("end_date", { ascending: true })

    if (restrictToOwn && user) {
      query = query.eq("customers.account_manager_id", user.id)
    }

    const { data } = await query
    setAgreements(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setCustomerId("")
    setSelectedCustomerOrg(null)
    setNewTitle(""); setNewStart(""); setNewEnd("")
    setNewContactName(""); setNewContactEmail(""); setNewContactPhone("")
    setNewSigned(false); setNewFile(null); setRemoveExistingFile(false)
  }

  function openSlideOver() { resetForm(); setSlideOverOpen(true) }
  function closeSlideOver() { resetForm(); setSlideOverOpen(false) }

  async function handleSave(opts?: { generatedFile?: File; content?: string; templateId?: string }) {
    if (!supabase || !user || !customerId || !newTitle || !newStart || !newEnd) return

    const fileToUpload = opts?.generatedFile ?? newFile
    let file_url: string | null = null
    if (fileToUpload) {
      const fileExt = fileToUpload.name.split(".").pop()
      const fileName = `${customerId}/${Date.now()}.${fileExt}`
      const { data: upload, error } = await supabase.storage.from("agreements").upload(fileName, fileToUpload)
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
      ...(opts?.content ? { content: opts.content } : {}),
      ...(opts?.templateId ? { template_id: opts.templateId } : {}),
    })

    closeSlideOver()
    fetchAgreements()
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

  const filtered = agreements.filter((a) => {
    if (filter === "all") return true
    if (filter === "expiresSoon") {
      const days = daysUntil(a.end_date)
      return !a.archived && days >= 0 && days <= 30
    }
    return getStatus(a) === filter
  })

  function StatusBadge({ a }: { a: Agreement }) {
    const status = getStatus(a)
    const days = daysUntil(a.end_date)

    if (status === "archived")
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200">Arkivert</span>
    if (status === "expired")
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">Utløpt</span>
    if (status === "upcoming")
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-200">Kommende</span>
    if (days <= 7)
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">Utløper om {days}d</span>
    if (days <= 30)
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">Utløper om {days}d</span>
    return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">Aktiv</span>
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("no-NO", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Avtaler</h1>
        <button
          onClick={openSlideOver}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Ny avtale
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
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
        <p className="text-sm text-gray-400">Laster...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen avtaler matcher valgt filter.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tittel</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Kunde</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Periode</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/customers/${a.customer_id}?agreementId=${a.id}`)}
                  className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                  <td className="px-4 py-3 text-gray-500">{a.customers?.name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
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
        <p className="text-xs text-gray-400">{filtered.length} avtale{filtered.length !== 1 ? "r" : ""}</p>
      )}

      <AgreementSlideOver
        open={slideOverOpen}
        onClose={closeSlideOver}
        editingAgreement={null}
        customers={customers}
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
        mergeData={{
          kunde_navn: customers.find((c) => c.id === customerId)?.name,
          org_nummer: selectedCustomerOrg ?? undefined,
          firma_navn: account?.name,
        }}
        onSave={handleSave}
      />
    </div>
  )
}
