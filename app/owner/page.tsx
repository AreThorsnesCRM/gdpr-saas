"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Stats = {
  accounts: {
    total: number
    trialing: number
    active: number
    canceled: number
    past_due: number
  }
  users: { total: number }
  credits: {
    totalPurchased: number
    totalIncluded: number
    totalUnused: number
    autoTopupEnabled: number
    esignatureNeeded: number
  }
  agreements: {
    total: number
    active: number
    signingPending: number
    signingSigned: number
  }
  recentAccounts: { name: string; status: string; created_at: string }[]
  conversionRate: number | null
}

export default function OwnerDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/owner/stats")
      .then(async (res) => {
        if (res.status === 403) { router.replace("/"); return }
        if (!res.ok) { setError("Kunne ikke hente statistikk"); return }
        setStats(await res.json())
      })
      .catch(() => setError("Nettverksfeil"))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Laster...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  )

  if (!stats) return null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pactiva — Eier-dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Kun synlig for deg</p>
        </div>

        {/* Kontoer */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Kontoer</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Prøveperiode" value={stats.accounts.trialing} color="blue" />
            <StatCard label="Aktive abonnenter" value={stats.accounts.active} color="green" />
            <StatCard label="Kansellerte" value={stats.accounts.canceled} color="gray" />
            <StatCard label="Forfalte betaling" value={stats.accounts.past_due} color="red" />
          </div>
          <div className="flex gap-6 px-1 text-sm text-gray-500">
            <span>Totalt kontoer: <span className="font-semibold text-gray-800">{stats.accounts.total}</span></span>
            <span>Totalt brukere: <span className="font-semibold text-gray-800">{stats.users.total}</span></span>
          </div>
        </section>

        {/* Signeringskreditter */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Signeringskreditter</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Kjøpt av kunder" value={stats.credits.totalPurchased} note="Kun aktive abonnenter" />
            <StatCard label="Inkludert i abonnement" value={stats.credits.totalIncluded} note="Kun aktive abonnenter" />
            <StatCard label="Totalt utestående" value={stats.credits.totalUnused} note="Kun aktive abonnenter" />
            <StatCard label="Auto-påfyll aktivert" value={stats.credits.autoTopupEnabled} />
            <StatCard
              label="e-signature kreditter nødvendig"
              value={stats.credits.esignatureNeeded}
              color="red"
              note="Maks behov (alle OTP)"
            />
          </div>
        </section>

        {/* Avtaler */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Avtaler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Totalt" value={stats.agreements.total} />
            <StatCard label="Aktive nå" value={stats.agreements.active} color="green" note="Signert og innenfor perioden" />
            <StatCard label="Venter på signering" value={stats.agreements.signingPending} color="blue" />
            <StatCard label="Digitalt signert" value={stats.agreements.signingSigned} />
          </div>
        </section>

        {/* Konverteringsrate */}
        {stats.conversionRate !== null && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Vekst</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Konverteringsrate"
                value={stats.conversionRate}
                suffix="%"
                color={stats.conversionRate >= 50 ? "green" : "blue"}
                note="Aktive / (aktive + kansellerte)"
              />
            </div>
          </section>
        )}

        {/* Nyeste registreringer */}
        {stats.recentAccounts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Nyeste registreringer</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {stats.recentAccounts.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.name || "—"}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString("no-NO", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-gray-300 pt-4">
          Oppdatert: {new Date().toLocaleString("no-NO")}
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, color = "default", note, suffix }: {
  label: string
  value: number
  color?: "default" | "green" | "blue" | "red" | "gray"
  note?: string
  suffix?: string
}) {
  const valueColors = {
    default: "text-gray-900",
    green:   value > 0 ? "text-green-600" : "text-gray-900",
    blue:    value > 0 ? "text-blue-600"  : "text-gray-900",
    red:     value > 0 ? "text-red-600"   : "text-gray-900",
    gray:    "text-gray-500",
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColors[color]}`}>{value}{suffix}</p>
      {note && <p className="text-xs text-gray-300 mt-1">{note}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    trialing: { label: "Prøveperiode", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    active:   { label: "Aktiv",        cls: "bg-green-50 text-green-700 ring-green-200" },
    canceled: { label: "Kansellert",   cls: "bg-gray-100 text-gray-500 ring-gray-200" },
    past_due: { label: "Forfalt",      cls: "bg-red-50 text-red-600 ring-red-200" },
  }
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500 ring-gray-200" }
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ring-1 ${s.cls}`}>{s.label}</span>
  )
}
