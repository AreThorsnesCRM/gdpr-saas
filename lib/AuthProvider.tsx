"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { AuthContext, type AuthContextType, type Profile } from "./AuthContext"
import { getProfile } from "./actions"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Hent profil fra server action
  const fetchProfile = useCallback(async (retries = 3) => {
    if (!supabase) {
      console.error("[AuthProvider] Supabase not configured")
      setProfile(null)
      return
    }

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[AuthProvider] Fetching profile via server action (attempt ${i + 1})`)
        const profile = await getProfile()
        console.log("[AuthProvider] Profile fetched:", profile)
        setProfile(profile)
        return
      } catch (error) {
        console.error(`[AuthProvider] Exception in fetchProfile (attempt ${i + 1}):`, error)
        if (i === retries - 1) {
          setProfile(null)
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
        }
      }
    }
  }, [])

  // Initialisér session på mount
  useEffect(() => {
    let cleanup: (() => void) | undefined
    let mounted = true

    async function initAuth() {
      if (!supabase) {
        console.error("[AuthProvider] Supabase not configured, skipping auth init")
        setLoading(false)
        return
      }

      try {
        // Prøv å hent session fra cookies
        const { data: sessionData } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionData?.session?.user) {
          console.log("[AuthProvider] Session found from cookies, fetching profile...")
          setUser({
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
          })
          await fetchProfile()
          setLoading(false)
          return
        }

        console.log("[AuthProvider] No session in cookies, waiting for auth state change...")

        // Hvis ingen session, sett opp listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("[AuthProvider] Auth event:", event, "- Session:", !!session?.user)

          if (!mounted) return

          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email,
            })
            await fetchProfile()
          } else {
            setUser(null)
            setProfile(null)
          }
          setLoading(false)
        })

        cleanup = () => subscription.unsubscribe()
      } catch (error) {
        console.error("[AuthProvider] Error during init:", error)
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    return () => {
      mounted = false
      cleanup?.()
    }
  }, [fetchProfile])

  // Listen for page visibility changes (e.g., returning from external site)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log("[AuthProvider] Page became visible, refetching profile")
        fetchProfile()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user, fetchProfile])

  const logout = async () => {
    if (!supabase) {
      console.error("[AuthProvider] Supabase not configured")
      router.replace("/login")
      return
    }

    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      router.replace("/login")
    } catch (error) {
      console.error("[AuthProvider] Logout error:", error)
      // Fallback
      router.replace("/login")
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
