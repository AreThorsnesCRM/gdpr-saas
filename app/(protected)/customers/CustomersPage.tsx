"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import { TrashIcon, ChevronRightIcon } from "@heroicons/react/24/outline"

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  hasActiveAgreement?: boolean
  hasNeverHadAgreement?: boolean
  daysSinceEnd?: number | null
}

const filters = [
  { id: "all",    label: "Alle kunder" },
  { id: "active", label: "Med aktiv avtale" },
  { id: "noActive", label: "Uten aktiv avtale" },
  { id: "never",  label: "Aldri hatt avtale" },
]

export default function CustomersPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  const activeFilter =
    searchParams.get("noActive") === "true" ? "noActive" :
    searchParams.get("active") === "true"   ? "active"   :
    searchParams.get("never") === "true"    ? "never"    : "all"

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadCustomers()
  }, [user])

  async function loadCustomers() {
    if (!supabase) return
    setLoading(true)

    const today = new Date().toISOString().split("T")[0]

    const { data: customerData } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .order("created_at", { ascending: false })

    const { data: agreements } = await supabase
      .from("agreements")
      .select("customer_id, archived, end_date")

    if (!customerData) { setLoading(false); return }

    const enriched = customerData.map((c) => {
      const all = (agreements ?? []).filter((a) => a.customer_id === c.id)
      const hasActive = all.some((a) => !a.archived && (!a.end_date || a.end_date >= today))
      const ended = all
        .filter((a) => a.end_date && a.end_date < today)
        .sort((a, b) => b.end_date.localeCompare(a.end_date))
      const daysSinceEnd = ended[0]
        ? Math.ceil((Date.now() - new Date(ended[0].end_date).getTime()) / 86400000)
        : null

      return {
        ...c,
        hasActiveAgreement: hasActive,
        hasNeverHadAgreement: all.length === 0,
        daysSinceEnd,
      }
    })

    setCustomers(enriched)
    setLoading(false)
  }

  const filtered = customers.filter((c) => {
    if (activeFilter === "noActive") return !c.hasActiveAgreement
    if (activeFilter === "active")   return c.hasActiveAgreement
    if (activeFilter === "never")    return c.hasNeverHadAgreement
    return true
  })

  function setFilter(id: string) {
    if (id === "all") router.push("/customers")
    else router.push(`/customers?${id}=true`)
  }

  async function deleteCustomer(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!supabase || !window.confirm("Er du sikker på at du vil slette denne kunden?")) return
    await supabase.from("customers").delete().eq("id", id)
    loadCustomers()
  }

  function Badge({ c }: { c: Customer }) {
    if (c.hasActiveAgreement)
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">Aktiv avtale</span>
    if (c.hasNeverHadAgreement)
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">Ingen avtaler</span>
    if (c.daysSinceEnd != null)
      return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">Utløpt for {c.daysSinceEnd}d siden</span>
    return null
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">

      {/* Sidehode */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kunder</h1>
        <Link href="/customers/new"
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
          Ny kunde
        </Link>
      </div>

      {/* Filterknapper */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === f.id
                ? "bg-slate-800 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Kundeliste */}
      {loading ? (
        <p className="text-sm text-gray-400">Laster...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen kunder matcher dette filteret.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors border-t border-gray-100 first:border-0 group">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">{c.email ?? "Ingen e-post"}</p>
              </div>
              <div className="flex items-center gap-4 ml-4 shrink-0">
                <Badge c={c} />
                <button
                  onClick={(e) => deleteCustomer(e, c.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Slett kunde">
                  <TrashIcon className="h-4 w-4" />
                </button>
                <ChevronRightIcon className="h-4 w-4 text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
