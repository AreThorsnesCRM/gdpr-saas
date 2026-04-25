"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)

    const email = String(formData.get("email") || "")
    const password = String(formData.get("password") || "")

    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      setError("Feil e‑post eller passord")
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
    <div className="w-full max-w-sm bg-white p-6 rounded shadow space-y-4">
      <h1 className="text-xl font-semibold">Logg inn</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="email"
          placeholder="E‑post"
          className="border p-2 rounded w-full"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Passord"
          className="border p-2 rounded w-full"
          required
        />

        {error && (
          <p className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          Logg inn
        </button>
      </form>

      <form action="/forgot-password">
        <button
          type="submit"
          className="text-blue-600 underline text-sm w-full text-center"
        >
          Glemt passord?
        </button>
      </form>

      {/* 🔥 Ny seksjon: Opprett konto */}
      <p className="text-sm text-gray-600 text-center">
        Har du ikke konto?{" "}
        <a
          href="/register"
          className="text-blue-600 hover:underline font-medium"
        >
          Opprett en her
        </a>
      </p>
    </div>
  )
}
