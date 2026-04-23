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

  // Hent profil fra database
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log("[AuthProvider] Fetching profile for user:", userId)

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single<Profile>()

      console.log("[AuthProvider] Query result - error:", error, "data:", data)

      if (error) {
        console.error("[AuthProvider] DB Query error:", error.message)
        // Sjekk om det er PGRST116 (no rows returned) - det betyr profil finnes ikke
        if (error.code === "PGRST116") {
          console.warn("[AuthProvider] Profile not found for user, might need to create it")
        }
        return
      }

      if (data) {
        console.log("[AuthProvider] Profile loaded successfully:", {
          company: data.company_name,
          name: data.full_name,
          status: data.subscription_status,
        })
        setProfile(data)
      } else {
        console.warn("[AuthProvider] No profile data returned (data is null)")
      }
    } catch (error) {
      console.error("[AuthProvider] Exception in fetchProfile:", error)
    }
  }, [])

  // Initialisér session på mount
  useEffect(() => {
    let cleanup: (() => void) | undefined
    let mounted = true

    async function initAuth() {
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
          await fetchProfile(sessionData.session.user.id)
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
            await fetchProfile(session.user.id)
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

  // Listen for auth state changes (login, logout, token refresh, etc)
  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log("[AuthProvider] Auth state changed:", event)

      if (!session?.user) {
        console.log("[AuthProvider] No user session")
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      console.log("[AuthProvider] User session updated:", session.user.id)

      // Oppdater user info
      setUser({
        id: session.user.id,
        email: session.user.email,
      })

      // Re-fetch profil på viktige events
      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED"
      ) {
        console.log("[AuthProvider] Fetching profile for event:", event)
        await fetchProfile(session.user.id)
        console.log("[AuthProvider] Profile fetch complete")
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const logout = async () => {
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
