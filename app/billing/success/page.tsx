"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/AuthContext"

export default function BillingSuccessPage() {
  const { account, refreshAccount } = useAuth()
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (account?.subscription_status === "active") {
      router.replace("/dashboard")
      return
    }
    if (attempts >= 10) {
      router.replace("/dashboard")
      return
    }
    const timer = setTimeout(async () => {
      await refreshAccount()
      setAttempts(a => a + 1)
    }, 2000)
    return () => clearTimeout(timer)
  }, [account, attempts, refreshAccount, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Betaling mottatt!</h1>
        <p className="text-gray-500 mb-6">Aktiverer abonnementet ditt...</p>
        <div className="flex justify-center gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
