"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function InviteConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")

  useEffect(() => {
    if (!supabase) {
      setError("Tjeneste ikke tilgjengelig")
      return
    }

    let done = false

    async function handleSession() {
      if (done) return
      done = true

      // PKCE-flyt: bytt code mot session
      const code = searchParams.get("code")
      if (code) {
        const { error } = await supabase!.auth.exchangeCodeForSession(code)
        if (error) {
          setError("Ugyldig eller utløpt invitasjonslenke.")
          return
        }
      }

      // Hent bruker (fungerer etter code-bytte eller hash-fragment)
      const { data: { user } } = await supabase!.auth.getUser()
      if (!user) {
        setError("Kunne ikke verifisere brukeren. Prøv å klikke lenken i e-posten igjen.")
        return
      }

      // Koble bruker til firmakonto via pending_invites
      const res = await fetch("/api/account/accept-invite", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt under aktivering av kontoen.")
        return
      }

      router.replace(data.redirect)
    }

    // Håndter hash-fragment (eldre Supabase-flyt: #access_token=...)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") handleSession()
    })

    // Prøv også direkte (PKCE-flyt med code i URL)
    handleSession()

    return () => subscription.unsubscribe()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/login" className="text-sm text-blue-600 underline">Gå til innlogging</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-slate-800 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Aktiverer konto...</p>
      </div>
    </div>
  )
}
