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

        <p className="text-xs text-gray-300 pt-4">
          Oppdatert: {new Date().toLocaleString("no-NO")}
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, color = "default", note }: {
  label: string
  value: number
  color?: "default" | "green" | "blue" | "red" | "gray"
  note?: string
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
      <p className={`text-3xl font-bold ${valueColors[color]}`}>{value}</p>
      {note && <p className="text-xs text-gray-300 mt-1">{note}</p>}
    </div>
  )
}
