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

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError("Kunne ikke oppdatere passord.")
      return
    }

    setMessage("Passordet er oppdatert. Du kan nå logge inn.")
    setTimeout(() => router.push("/login"), 2000)
  }

  return (
    <div className="w-full max-w-sm bg-white p-6 rounded shadow space-y-4">
      <h1 className="text-xl font-semibold">Nytt passord</h1>

      {message && <p className="text-green-600">{message}</p>}
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Nytt passord"
          className="border p-2 rounded w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          Oppdater passord
        </button>
      </form>
    </div>
  )
}
