"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"

export default function AuthGuard() {
  const router = useRouter()
  const { account, loading: authLoading } = useAuth()

  useEffect(() => {
    async function checkSession() {
      if (!supabase) { router.replace("/login"); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    if (authLoading || !account) return

    const status = account.subscription_status
    const trialEnd = account.trial_end ? new Date(account.trial_end) : null
    const trialExpired = status === "trialing" && (!trialEnd || new Date() > trialEnd)

    if (trialExpired) {
      router.replace("/billing/upgrade?reason=trial")
    } else if (status === "canceled") {
      router.replace("/billing/upgrade?reason=canceled")
    } else if (status === "incomplete" || status === "unpaid") {
      router.replace("/billing/upgrade?reason=incomplete")
    } else if (status === "past_due") {
      router.replace("/billing/payment-required")
    }
  }, [account, authLoading, router])

  return null
}
