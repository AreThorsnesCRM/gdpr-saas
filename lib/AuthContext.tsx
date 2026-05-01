"use client"

import React, { createContext, useContext } from "react"

export type Account = {
  id: string
  name: string
  subscription_status: string | null
  trial_start: string | null
  trial_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export type Profile = {
  id: string
  user_id: string
  account_id: string | null
  full_name: string | null
}

export type AuthContextType = {
  user: { id: string; email?: string } | null
  profile: Profile | null
  account: Account | null
  role: "admin" | "member" | null
  restrictToOwn: boolean
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
