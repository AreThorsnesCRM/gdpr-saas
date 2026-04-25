"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthGuard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function run() {
      if (!supabase) {
        console.error("[AuthGuard] Supabase not available")
        router.replace("/login")
        return
      }

      // Bare sjekk at brukeren er logget inn
      // La middleware.ts og backend håndtere subscription-status
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (!isMounted) return

      if (!session?.user) {
        console.log("[AuthGuard] No session, redirecting to login")
        router.replace("/login")
        return
      }

      console.log("[AuthGuard] User authenticated")
      setLoading(false)
    }

    run()

    return () => {
      isMounted = false
    }
  }, [router])

  // Ikke blokker UI – bare vent stille
  if (loading) return null

  return null
}
