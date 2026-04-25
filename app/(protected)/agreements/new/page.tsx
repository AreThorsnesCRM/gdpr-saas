"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"

type Customer = {
  id: string
  name: string
}

export default function NewAgreementPage() {
  const router = useRouter()

  const [sessionReady, setSessionReady] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  // Form state
  const [customerId, setCustomerId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)

  // Session hydrering
  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function waitForSession() {
      if (!supabase) {
        console.error("[NewAgreementPage] Supabase not available")
        return
      }

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

      cleanup = () => subscription.unsubscribe()
    }

    waitForSession()

    return () => cleanup?.()
  }, [])

  // Hent kunder når session er klar
  useEffect(() => {
    if (!sessionReady) return
    loadCustomers()
  }, [sessionReady])

  async function loadCustomers() {
    if (!supabase) {
      console.error("[NewAgreementPage] Supabase not available")
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Error getting user:", userError)
      return
    }

    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name")

    if (error) {
      console.error("Error fetching customers:", error)
      setCustomers([])
    } else {
      setCustomers(data || [])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (!supabase) {
      alert("Tjeneste ikke tilgjengelig")
      setLoading(false)
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      alert("Du må være logget inn")
      setLoading(false)
      return
    }

    const { error } = await supabase.from("agreements").insert({
      customer_id: customerId,
      user_id: user.id,
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      archived: false,
    })

    if (error) {
      console.error("Error creating agreement:", error)
      alert("Kunne ikke opprette avtale")
    } else {
      router.push("/agreements")
    }

    setLoading(false)
  }

  if (!sessionReady) {
    return <p>Laster...</p>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ny avtale</h1>
        <Link
          href="/agreements"
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Tilbake
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Kunde</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Velg kunde</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tittel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Beskrivelse</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Startdato</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Sluttdato</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Oppretter..." : "Opprett avtale"}
        </button>
      </form>
    </div>
  )
}