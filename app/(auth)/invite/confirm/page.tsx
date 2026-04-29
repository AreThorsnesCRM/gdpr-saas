"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-slate-800 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Aktiverer konto...</p>
      </div>
    </div>
  )
}

function InviteConfirm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")

  useEffect(() => {
    if (!supabase) {
      setError("Tjeneste ikke tilgjengelig")
      return
    }

    let done = false

    async function processUser() {
      if (done) return
      done = true

      const { data: { user } } = await supabase!.auth.getUser()
      if (!user) {
        setError("Kunne ikke verifisere brukeren. Prøv å klikke lenken i e-posten igjen.")
        return
      }

      const res = await fetch("/api/account/accept-invite", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt under aktivering av kontoen.")
        return
      }

      router.replace(data.redirect)
    }

    // Sett opp lytter FØR alt annet — fanger opp både hash-fragment og PKCE
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        processUser()
      }
    })

    // PKCE-flyt: bytt code mot session (triggerer SIGNED_IN over)
    const code = searchParams.get("code")
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          done = true
          setError("Ugyldig eller utløpt invitasjonslenke.")
        }
      })
    }

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

  return <Spinner />
}

export default function InviteConfirmPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <InviteConfirm />
    </Suspense>
  )
}
