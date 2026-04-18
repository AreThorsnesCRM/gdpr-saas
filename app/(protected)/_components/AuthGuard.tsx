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
      // 1. Vent på at Supabase faktisk er hydrert
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (!isMounted) return

      if (!session?.user) {
        router.replace("/login")
        return
      }

      // 2. Hent profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (!isMounted) return

      if (!profile) {
        router.replace("/subscribe")
        return
      }

      // 3. Sjekk abonnement
      const now = new Date()
      const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null

      const trialActive =
        profile.subscription_status === "trialing" &&
        trialEnd &&
        trialEnd > now

      const subscriptionActive = profile.subscription_status === "active"

      if (!trialActive && !subscriptionActive) {
        router.replace("/subscribe")
        return
      }

      // 4. Ferdig
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
