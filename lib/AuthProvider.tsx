"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { AuthContext, type AuthContextType, type Profile } from "./AuthContext"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Hent profil fra klient når bruker er til stede
  const fetchProfile = useCallback(async (retries = 3) => {
    if (!supabase || !user) {
      console.error("[AuthProvider] Supabase not configured or no user")
      setProfile(null)
      return
    }

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[AuthProvider] Fetching profile via client (attempt ${i + 1}) for user ${user.id}`)
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (error) {
          console.error("Error fetching profile:", error)
          if (i === retries - 1) {
            setProfile(null)
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
          }
        } else {
          console.log("[AuthProvider] Profile fetched:", profile)
          setProfile(profile)
          return
        }
      } catch (error) {
        console.error(`[AuthProvider] Exception in fetchProfile (attempt ${i + 1}):`, error)
        if (i === retries - 1) {
          setProfile(null)
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    fetchProfile()
  }, [user, fetchProfile])

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

      // Check for temporary session cookie from callback
      const tempSessionCookie = document.cookie.split('; ').find(row => row.startsWith('temp_session='))
      if (tempSessionCookie) {
        const tempSessionValue = tempSessionCookie.split('=')[1]
        try {
          const sessionData = JSON.parse(decodeURIComponent(tempSessionValue))
          await supabase.auth.setSession(sessionData)
          // Delete the cookie
          document.cookie = 'temp_session=; path=/; maxAge=0'
        } catch (error) {
          console.error("[AuthProvider] Failed to parse temp session:", error)
        }
      }

      // Sett alltid opp lytteren — fanger SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          })
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      })

      cleanup = () => subscription.unsubscribe()

      try {
        // Hent initiell session fra cookies for rask hydration
        const { data: sessionData } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionData?.session?.user) {
          setUser({
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
          })
        }
        setLoading(false)
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
  }, [])

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
      await fetch("/api/logout", { method: "POST" })
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      router.replace("/login")
    } catch (error) {
      console.error("[AuthProvider] Logout error:", error)
      setUser(null)
      setProfile(null)
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
