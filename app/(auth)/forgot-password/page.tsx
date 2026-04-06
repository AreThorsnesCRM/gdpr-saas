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
    <div className="w-full max-w-sm bg-white p-6 rounded shadow space-y-4">
      <h1 className="text-xl font-semibold">Glemt passord</h1>

      {message && <p className="text-green-600">{message}</p>}
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Din e‑postadresse"
          className="border p-2 rounded w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          Send tilbakestillings‑link
        </button>
      </form>
    </div>
  )
}
