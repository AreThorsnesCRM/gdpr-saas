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
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single<Profile>()

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error("[AuthProvider] Error fetching profile:", error)
    }
  }, [])

  // Initialisér session på mount
  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function initAuth() {
      try {
        // Prøv å hent session fra cookies (raskest)
        const { data: sessionData } = await supabase.auth.getSession()

        if (sessionData?.session?.user) {
          setUser({
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
          })
          await fetchProfile(sessionData.session.user.id)
          setLoading(false)
          return
        }

        // Hvis ingen session, vent på onAuthStateChange
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
        setLoading(false)
      }
    }

    initAuth()

    return () => cleanup?.()
  }, [fetchProfile])

  // Listen for auth state changes (loggen ut, token refresh, etc)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthProvider] Auth event:", event)

      if (!session?.user) {
        setUser(null)
        setProfile(null)
        return
      }

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
        await fetchProfile(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
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
