"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import Link from "next/link"
import { ChevronLeftIcon } from "@heroicons/react/24/outline"

type Customer = {
  id: string
  name: string
}

export default function NewAgreementPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase || !user) return
    supabase
      .from("customers")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCustomers(data ?? []))
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !user) return
    setLoading(true)

    const { error } = await supabase.from("agreements").insert({
      customer_id: customerId,
      user_id: user.id,
      title,
      description: description || null,
      start_date: startDate,
      end_date: endDate,
      archived: false,
    })

    setLoading(false)
    if (!error) router.push("/agreements")
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

  return (
    <div className="p-8 max-w-2xl space-y-6">

      <Link href="/agreements" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        Avtaler
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Ny avtale</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kunde *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Velg kunde</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tittel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Serviceavtale 2025"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Beskrivelse</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valgfri beskrivelse av avtalen"
              className={inputCls}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Startdato *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sluttdato *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !customerId}
            className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Oppretter..." : "Opprett avtale"}
          </button>

        </form>
      </div>
    </div>
  )
}
