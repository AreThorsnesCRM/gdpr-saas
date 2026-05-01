"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { CheckCircleIcon } from "@heroicons/react/24/outline"

const features = [
  "Full oversikt over kunder og avtaler",
  "GDPR-vennlig håndtering av kundeinformasjon",
  "Automatiske varsler ved utløpende avtaler",
]

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") || "")
    const password = String(formData.get("password") || "")

    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })

    if (!res.ok) {
      setError("Feil e‑post eller passord")
      setLoading(false)
      return
    }

    const body = await res.json()
    if (body.session && supabase) {
      await supabase.auth.setSession({
        access_token: body.session.access_token,
        refresh_token: body.session.refresh_token,
      })
    }

    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex">

      {/* Venstre — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <p className="text-white text-xl font-bold tracking-tight">AreCRM</p>

        <div className="space-y-8">
          <div>
            <h2 className="text-white text-3xl font-bold leading-snug">
              Hold styr på kunder<br />og avtaler — enkelt.
            </h2>
            <p className="text-slate-400 mt-3 text-base leading-relaxed">
              Et CRM bygget for bedrifter som tar GDPR på alvor.
            </p>
          </div>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                <CheckCircleIcon className="h-5 w-5 text-green-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} AreCRM</p>
      </div>

      {/* Høyre — skjema */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Logo på mobil */}
          <p className="lg:hidden text-slate-900 text-xl font-bold mb-8 tracking-tight">AreCRM</p>

          <h1 className="text-2xl font-bold text-gray-900">Logg inn</h1>
          <p className="text-gray-500 text-sm mt-1 mb-8">Velkommen tilbake!</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-post</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Passord</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Logger inn..." : "Logg inn"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-gray-500 hover:text-gray-900 transition-colors">
              Glemt passord?
            </Link>
            <Link href="/register" className="text-gray-500 hover:text-gray-900 transition-colors">
              Opprett konto →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
