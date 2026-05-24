"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
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

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError("Kunne ikke oppdatere passord.")
      return
    }

    setMessage("Passordet er oppdatert. Du kan nå logge inn.")
    setTimeout(() => router.push("/login"), 2000)
  }

  return (
    <div className="min-h-screen flex">

      {/* Venstre — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <img src="/pactiva-logo-light.svg" alt="Pactiva" className="h-16" />
        <div className="space-y-4">
          <h2 className="text-white text-3xl font-bold leading-snug">
            Velg et nytt<br />passord
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Passordet må være minst 8 tegn langt.
          </p>
        </div>
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Pactiva</p>
      </div>

      {/* Høyre — skjema */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-sm">

          <img src="/pactiva-logo-dark.svg" alt="Pactiva" className="lg:hidden h-10 mb-8" />

          <h1 className="text-2xl font-bold text-gray-900">Nytt passord</h1>
          <p className="text-gray-500 text-sm mt-1 mb-8">Skriv inn et nytt passord for kontoen din.</p>

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nytt passord</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Oppdater passord
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
