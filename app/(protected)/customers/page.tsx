"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

type Customer = {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  created_at?: string
}

type CustomerWithMeta = Customer & {
  lastAgreementEnd?: string | null
  daysSinceEnd?: number | null
  hasNeverHadAgreement?: boolean
  hasActiveAgreement?: boolean
}

export default function CustomersPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const filterNoActive = searchParams.get("noActive") === "true"
  const filterActive = searchParams.get("active") === "true"
  const filterNever = searchParams.get("never") === "true"

  const [customers, setCustomers] = useState<CustomerWithMeta[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithMeta[]>([])

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [customers, filterNoActive, filterActive, filterNever])

  async function loadCustomers() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: customerData } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    const { data: agreements } = await supabase
      .from("agreements")
      .select("customer_id, archived, end_date")

    if (!customerData || !agreements) {
      setCustomers([])
      return
    }

    const enriched = customerData.map((c) => {
      const customerAgreements = agreements.filter(a => a.customer_id === c.id)

      if (customerAgreements.length === 0) {
        return {
          ...c,
          hasNeverHadAgreement: true,
          hasActiveAgreement: false,
          lastAgreementEnd: null,
          daysSinceEnd: null,
        }
      }

      const hasActive = customerAgreements.some(a => !a.archived)

      const ended = customerAgreements
        .filter(a => a.archived)
        .sort((a, b) => (a.end_date > b.end_date ? -1 : 1))

      if (ended.length === 0) {
        return {
          ...c,
          hasNeverHadAgreement: false,
          hasActiveAgreement: hasActive,
          lastAgreementEnd: null,
          daysSinceEnd: null,
        }
      }

      const lastEnd = ended[0].end_date
      const days = Math.ceil(
        (new Date().getTime() - new Date(lastEnd).getTime()) /
        (1000 * 60 * 60 * 24)
      )

      return {
        ...c,
        hasNeverHadAgreement: false,
        hasActiveAgreement: hasActive,
        lastAgreementEnd: lastEnd,
        daysSinceEnd: days,
      }
    })

    setCustomers(enriched)
  }

  function applyFilters() {
    let list = [...customers]

    if (filterNoActive) list = list.filter(c => !c.hasActiveAgreement)
    if (filterActive) list = list.filter(c => c.hasActiveAgreement)
    if (filterNever) list = list.filter(c => c.hasNeverHadAgreement)

    setFilteredCustomers(list)
  }

  function getBadge(c: CustomerWithMeta) {
    if (c.hasActiveAgreement) {
      return (
        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 border border-green-300">
          Aktiv avtale
        </span>
      )
    }

    if (c.hasNeverHadAgreement) {
      return (
        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-300">
          Ingen avtaler
        </span>
      )
    }

    if (c.daysSinceEnd != null) {
      return (
        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 border border-yellow-300">
          Utløp for {c.daysSinceEnd} dager siden
        </span>
      )
    }

    return null
  }

  function clearFilters() {
    router.push("/customers")
  }

  function setFilter(param: string) {
    router.push(`/customers?${param}=true`)
  }

  // ⭐ Lagt til — dette var feilen
  async function deleteCustomer(customerId: string) {
    const confirmed = window.confirm("Er du sikker på at du vil slette denne kunden?")
    if (!confirmed) return

    await supabase.from("customers").delete().eq("id", customerId)

    // Oppdater listen
    loadCustomers()
  }

  return (
    <div className="p-6 space-y-10">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kunder</h1>

        <Link
          href="/customers/new"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          Ny kunde
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
        {filterNoActive || filterActive || filterNever ? (
          <>
            <span className="text-sm text-gray-600">
              Filter:
              {filterNoActive && " Kunder uten aktive avtaler"}
              {filterActive && " Kunder med aktive avtaler"}
              {filterNever && " Kunder som aldri har hatt avtale"}
            </span>

            <button
              onClick={clearFilters}
              className="text-blue-600 text-sm underline"
            >
              Vis alle
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-600">Vis:</span>

            <button
              onClick={() => clearFilters()}
              className="text-blue-600 text-sm underline"
            >
              Alle kunder
            </button>

            <button
              onClick={() => setFilter("noActive")}
              className="text-blue-600 text-sm underline"
            >
              Uten avtale
            </button>

            <button
              onClick={() => setFilter("active")}
              className="text-blue-600 text-sm underline"
            >
              Med aktive avtaler
            </button>

            <button
              onClick={() => setFilter("never")}
              className="text-blue-600 text-sm underline"
            >
              Aldri hatt avtale
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="space-y-4">
          {filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <Link href={`/customers/${c.id}`}>
                  <span className="font-semibold text-blue-600 cursor-pointer">
                    {c.name}
                  </span>
                </Link>

                <div className="text-sm text-gray-600">
                  {c.email || "Ingen e‑post"}
                </div>

                <div className="mt-1">
                  {getBadge(c)}
                </div>
              </div>

              <div className="flex gap-4">
                <Link
                  href={`/customers/${c.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Rediger her
                </Link>

                <button
                  onClick={() => deleteCustomer(c.id)}
                  className="text-red-600 hover:underline"
                >
                  Slett
                </button>
              </div>
            </div>
          ))}

          {filteredCustomers.length === 0 && (
            <p className="text-gray-500 text-sm">
              Ingen kunder matcher dette filteret
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
