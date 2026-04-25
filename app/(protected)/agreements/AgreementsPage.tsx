"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AgreementsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filter, setFilter] = useState<
    "all" | "active" | "expired" | "upcoming" | "archived" | "expiresSoon"
  >("all")

  const [agreements, setAgreements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Vent på session før vi henter data
  async function waitForSession() {
    let session = null

    while (!session) {
      const { data } = await supabase.auth.getSession()
      session = data.session
      if (!session) await new Promise((r) => setTimeout(r, 50))
    }

    return session
  }

  // Hent avtaler
  useEffect(() => {
    async function fetchAgreements() {
      setLoading(true)

      await waitForSession()

      const { data, error } = await supabase
        .from("agreements")
        .select("*, customers(name)")
        .order("start_date", { ascending: true })

      if (error) {
        console.error("Error fetching agreements:", error)
        setAgreements([])
      } else if (data) {
        setAgreements(data)
      }

      setLoading(false)
    }

    fetchAgreements()
  }, [])

  // Filter fra URL
  useEffect(() => {
    const urlFilter = searchParams.get("filter")
    const status = searchParams.get("status")
    const expiresSoon = searchParams.get("expiresSoon")

    if (
      urlFilter === "active" ||
      urlFilter === "expired" ||
      urlFilter === "upcoming" ||
      urlFilter === "archived" ||
      urlFilter === "expiresSoon"
    ) {
      setFilter(urlFilter)
      return
    }

    if (status === "active") {
      setFilter("active")
      return
    }

    if (expiresSoon === "true") {
      setFilter("expiresSoon")
      return
    }

    setFilter("all")
  }, [searchParams])

  function applyFilter(newFilter: typeof filter) {
    setFilter(newFilter)

    if (newFilter === "all") {
      router.push("/agreements")
    } else {
      router.push(`/agreements?filter=${newFilter}`)
    }
  }

  function daysUntil(dateStr: string) {
    const today = new Date()
    const target = new Date(dateStr)
    const diff = target.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  function getStatus(a: any) {
    const today = new Date().toISOString().split("T")[0]

    if (a.archived) return "archived"
    if (a.end_date < today) return "expired"
    if (a.start_date > today) return "upcoming"
    return "active"
  }

  const filtered = agreements.filter((a) => {
    const status = getStatus(a)

    if (filter === "all") return true
    if (filter === "expiresSoon") return daysUntil(a.end_date) <= 30 && !a.archived

    return status === filter
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Avtaler</h1>
        <Link
          href="/agreements/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Ny avtale
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded shadow">
        <span className="font-medium">Vis:</span>

        <button
          onClick={() => applyFilter("all")}
          className={`px-3 py-1 rounded border ${
            filter === "all" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Alle
        </button>

        <button
          onClick={() => applyFilter("active")}
          className={`px-3 py-1 rounded border ${
            filter === "active" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Aktive
        </button>

        <button
          onClick={() => applyFilter("expired")}
          className={`px-3 py-1 rounded border ${
            filter === "expired" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Utløpte
        </button>

        <button
          onClick={() => applyFilter("upcoming")}
          className={`px-3 py-1 rounded border ${
            filter === "upcoming" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Kommende
        </button>

        <button
          onClick={() => applyFilter("expiresSoon")}
          className={`px-3 py-1 rounded border ${
            filter === "expiresSoon" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Utløper snart
        </button>

        <button
          onClick={() => applyFilter("archived")}
          className={`px-3 py-1 rounded border ${
            filter === "archived" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Arkiverte
        </button>
      </div>

      {loading && <p>Laster avtaler...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-gray-500">Ingen avtaler funnet.</p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((a) => {
            const days = daysUntil(a.end_date)
            const badge =
              days < 0
                ? { text: "Utløpt", color: "bg-red-100 text-red-700 border-red-300" }
                : days <= 7
                ? { text: `Utløper om ${days} dager`, color: "bg-red-100 text-red-700 border-red-300" }
                : days <= 30
                ? { text: `Utløper om ${days} dager`, color: "bg-yellow-100 text-yellow-700 border-yellow-300" }
                : null

            return (
              <Link key={a.id} href={`/customers/${a.customer_id}?agreementId=${a.id}`}>
                <li className="border rounded p-4 hover:bg-gray-50 cursor-pointer transition">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{a.title}</div>

                    <div className="flex items-center gap-2">
                      {badge && (
                        <span className={`text-xs px-2 py-1 rounded border ${badge.color}`}>
                          {badge.text}
                        </span>
                      )}

                      <div className="text-sm text-gray-500">{a.customers?.name}</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mt-1">
                    {a.start_date} – {a.end_date}
                  </div>
                </li>
              </Link>
            )
          })}
        </ul>
      )}
    </div>
  )
}
