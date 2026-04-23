"use client"

import React, { createContext, useContext } from "react"

export type Profile = {
  id: string
  user_id: string
  full_name: string | null
  company_name: string | null
  subscription_status: string | null
  trial_start: string | null
  trial_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export type AuthContextType = {
  user: { id: string; email?: string } | null
  profile: Profile | null
  loading: boolean
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
