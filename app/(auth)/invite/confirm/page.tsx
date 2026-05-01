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

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl font-bold">!</span>
        </div>
        <h2 className="text-gray-900 font-semibold mb-2">{title}</h2>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <a
          href="/login"
          className="inline-block bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Gå til innlogging
        </a>
      </div>
    </div>
  )
}

function InviteConfirm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError({ title: "Tjeneste ikke tilgjengelig", message: "Prøv igjen senere." })
      return
    }

    const hash = typeof window !== "undefined" ? window.location.hash : ""

    // Supabase sendte en feil i hash-fragmentet (f.eks. utløpt lenke)
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.slice(1))
      const errorCode = params.get("error_code")
      const errorDesc = params.get("error_description")?.replace(/\+/g, " ")
      if (errorCode === "otp_expired" || errorDesc?.includes("expired")) {
        setError({
          title: "Invitasjonslenken er utløpt",
          message: "Lenken er kun gyldig i 24 timer. Be administratoren sende en ny invitasjon fra innstillingssiden.",
        })
      } else {
        setError({ title: "Noe gikk galt", message: errorDesc ?? "Ugyldig lenke." })
      }
      return
    }

    let done = false

    // Timeout — vis feil hvis ingenting skjer innen 15 sek
    const timeoutId = setTimeout(() => {
      if (!done) {
        setError({
          title: "Aktivering tok for lang tid",
          message: "Noe gikk galt. Prøv lenken i e-posten på nytt, eller kontakt support.",
        })
      }
    }, 15000)

    async function processUser() {
      if (done) return
      done = true
      clearTimeout(timeoutId)

      const { data: { session } } = await supabase!.auth.getSession()
      if (!session) {
        setError({ title: "Ingen sesjon funnet", message: "Prøv å klikke på lenken i e-posten på nytt." })
        return
      }

      const res = await fetch("/api/account/accept-invite", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()

      if (!res.ok) {
        setError({
          title: "Kunne ikke aktivere konto",
          message: data.error ?? "Ukjent feil. Kontakt support.",
        })
        return
      }

      router.replace(data.redirect)
    }

    // Flyt 1: access_token i hash-fragmentet (implicit flow)
    if (hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.slice(1))
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token") ?? ""
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: sessionError }) => {
            if (sessionError) {
              done = true
              clearTimeout(timeoutId)
              setError({ title: "Feil ved aktivering", message: sessionError.message })
            } else {
              processUser()
            }
          })
        return () => clearTimeout(timeoutId)
      }
    }

    // Flyt 2: code i query-params (PKCE flow)
    const code = searchParams.get("code")
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchError }) => {
        if (exchError) {
          done = true
          clearTimeout(timeoutId)
          if (exchError.message.includes("expired")) {
            setError({
              title: "Invitasjonslenken er utløpt",
              message: "Lenken er kun gyldig i 24 timer. Be administratoren sende en ny invitasjon.",
            })
          } else {
            setError({ title: "Feil ved aktivering", message: exchError.message })
          }
        } else {
          processUser()
        }
      })
      return () => clearTimeout(timeoutId)
    }

    // Fallback: lytt på auth-hendelser
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        processUser()
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [router, searchParams])

  if (error) return <ErrorScreen title={error.title} message={error.message} />
  return <Spinner />
}

export default function InviteConfirmPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <InviteConfirm />
    </Suspense>
  )
}
