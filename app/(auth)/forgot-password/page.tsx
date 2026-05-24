"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage("")
    setError("")

    if (!supabase) {
      setError("Tjeneste ikke tilgjengelig")
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError("Kunne ikke sende e‑post. Sjekk adressen.")
      return
    }

    setMessage("En e‑post med instruksjoner er sendt.")
  }

  return (
    <div className="min-h-screen flex">

      {/* Venstre — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <img src="/pactiva-logo-light.svg" alt="Pactiva" className="h-16" />
        <div className="space-y-4">
          <h2 className="text-white text-3xl font-bold leading-snug">
            Tilbakestill<br />passordet ditt
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Vi sender deg en e-post med en lenke for å opprette et nytt passord.
          </p>
        </div>
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Pactiva</p>
      </div>

      {/* Høyre — skjema */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-sm">

          <img src="/pactiva-logo-dark.svg" alt="Pactiva" className="lg:hidden h-10 mb-8" />

          <h1 className="text-2xl font-bold text-gray-900">Glemt passord?</h1>
          <p className="text-gray-500 text-sm mt-1 mb-8">Oppgi e-postadressen din så sender vi en tilbakestillingslenke.</p>

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-post</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Send tilbakestillingslenke
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            <a href="/login" className="text-gray-500 hover:text-gray-900 transition-colors">
              ← Tilbake til innlogging
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
