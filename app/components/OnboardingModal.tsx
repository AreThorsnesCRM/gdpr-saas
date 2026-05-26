"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/lib/AuthContext"
import ReactCountryFlag from "react-country-flag"

const COUNTRY_CODES = [
  "NO", "SE", "DK", "FI",
  "DE", "FR", "GB", "NL", "BE", "AT", "CH", "ES", "PT", "IT", "PL",
  "US", "CA", "BR", "MX",
  "OTHER",
]

function CountryFlag({ code }: { code: string }) {
  if (code === "OTHER") return <span className="text-base leading-none">🌍</span>
  return <ReactCountryFlag countryCode={code} svg style={{ width: "1.2em", height: "1.2em", flexShrink: 0 }} />
}

function stripEmoji(label: string) {
  // Strip leading emoji + whitespace, keep the text name
  return label.replace(/^[^\p{L}]+/u, "").trim()
}

export default function OnboardingModal() {
  const { account, loading } = useAuth()
  const t = useTranslations("onboarding")
  const [country, setCountry] = useState("NO")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

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
          <div ref={ref} className="relative">
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className="w-full flex items-center gap-2.5 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white text-left"
            >
              <CountryFlag code={country} />
              <span className="flex-1 text-gray-900">{stripEmoji(t(`countries.${country}`))}</span>
              <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {open && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto max-h-56">
                {COUNTRY_CODES.map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => { setCountry(code); setOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      code === country ? "bg-slate-50 text-slate-900 font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <CountryFlag code={code} />
                    <span className="flex-1 text-left">{stripEmoji(t(`countries.${code}`))}</span>
                    {code === country && (
                      <svg className="w-3.5 h-3.5 shrink-0 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
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
