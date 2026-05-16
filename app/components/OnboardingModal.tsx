"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/lib/AuthContext"

const COUNTRIES = [
  { code: "NO", label: "Norge" },
  { code: "SE", label: "Sverige" },
  { code: "DK", label: "Danmark" },
  { code: "FI", label: "Finland" },
  { code: "OTHER", label: "Annet" },
]

export default function OnboardingModal() {
  const { account, loading } = useAuth()
  const t = useTranslations("onboarding")
  const [country, setCountry] = useState("NO")
  const [saving, setSaving] = useState(false)

  if (loading || account?.country) return null

  async function handleSave() {
    setSaving(true)
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      })
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t("title")}</h2>
          <p className="text-sm text-gray-500 mt-2">{t("subtitle")}</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{t("countryLabel")}</label>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            autoFocus
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400">{t("countryHint")}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {saving ? t("saving") : t("saveButton")}
        </button>
      </div>
    </div>
  )
}
