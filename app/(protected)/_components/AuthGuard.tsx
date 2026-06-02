"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/AuthContext"

export default function AuthGuard() {
  const router = useRouter()
  const { user, account, loading: authLoading } = useAuth()

  // Vent til AuthProvider er ferdig — unngår race condition med setSession
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/login")
    }
  }, [user, authLoading, router])

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
