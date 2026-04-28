"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passordene er ikke like")
      return
    }

    if (password.length < 8) {
      setError("Passordet må være minst 8 tegn")
      return
    }

    if (!supabase) {
      setError("Tjeneste ikke tilgjengelig")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white p-6 rounded shadow space-y-4">
        <h1 className="text-xl font-semibold">Velg passord</h1>
        <p className="text-sm text-gray-600">Du er invitert! Velg et passord for å fullføre opprettelsen av kontoen din.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Passord (min. 8 tegn)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 rounded w-full"
            required
          />
          <input
            type="password"
            placeholder="Gjenta passord"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="border p-2 rounded w-full"
            required
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white w-full py-2 rounded disabled:opacity-50"
          >
            {loading ? "Lagrer..." : "Fullfør registrering"}
          </button>
        </form>
      </div>
    </div>
  )
}
