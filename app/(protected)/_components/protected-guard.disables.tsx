"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export function ProtectedGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (!supabase) {
        console.error("[ProtectedGuard] Supabase not available")
        router.replace("/login")
        return
      }

      // 1. Vent på session
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.replace("/login")
        return
      }

      const user = sessionData.session.user

      // 2. Hent profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (!profile) {
        router.replace("/subscribe")
        return
      }

      // 3. Trial / subscription sjekk
      const now = new Date()
      const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null

      const trialActive =
        profile.subscription_status === "trial" &&
        trialEnd &&
        trialEnd > now

      const subscriptionActive = profile.subscription_status === "active"

      if (!trialActive && !subscriptionActive) {
        router.replace("/subscribe")
        return
      }

      if (mounted) setReady(true)
    }

    init()

    return () => {
      mounted = false
    }
  }, [router])

  if (!ready) return null

  return <>{children}</>
}
