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

    if (trialExpired || status === "canceled" || status === "incomplete" || status === "unpaid") {
      router.replace("/billing/upgrade")
    } else if (status === "past_due") {
      router.replace("/billing/payment-required")
    }
  }, [account, authLoading, router])

  return null
}
