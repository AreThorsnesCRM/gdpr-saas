"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"

export default function NewCustomerPage() {
  const router = useRouter()

  const [sessionReady, setSessionReady] = useState(false)

  // -----------------------------
  // SESSION HYDRERING
  // -----------------------------
  useEffect(() => {
    let cleanup: (() => void) | undefined

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

      cleanup = () => subscription.unsubscribe()
    }

    waitForSession()

    return () => cleanup?.()
  }, [])

  // -----------------------------
  // STATE
  // -----------------------------
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)

  // -----------------------------
  // CREATE CUSTOMER
  // -----------------------------
  async function createCustomer() {
    if (!sessionReady) return

    if (!name.trim()) {
      alert("Navn er påkrevd.")
      return
    }

    setLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("getUser error:", userError)
      alert("Kunne ikke hente bruker.")
      setLoading(false)
      return
    }

    if (!user) {
      alert("Ingen bruker funnet.")
      setLoading(false)
      return
    }

    const { error } = await supabase.from("customers").insert([
      {
        user_id: user.id,
        name,
        email,
        phone,
      },
    ])

    setLoading(false)

    if (error) {
      console.error("createCustomer error:", error)
      alert("Kunne ikke opprette kunde.")
      return
    }

    router.push("/customers")
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ny kunde</h1>

        <Link
          href="/customers"
          className="text-blue-600 underline text-sm"
        >
          Tilbake til kunder
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">

        <div className="space-y-2">
          <label className="text-sm font-medium">Navn *</label>
          <input
            className="border p-2 rounded w-full"
            placeholder="Kundenavn"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">E‑post</label>
          <input
            className="border p-2 rounded w-full"
            placeholder="E‑postadresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Telefon</label>
          <input
            className="border p-2 rounded w-full"
            placeholder="Telefonnummer"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button
          onClick={createCustomer}
          disabled={loading || !sessionReady}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Lagrer..." : "Opprett kunde"}
        </button>

      </div>
    </div>
  )
}
