"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { AuthContext, type AuthContextType, type Profile, type Account } from "./AuthContext"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [role, setRole] = useState<"admin" | "member" | null>(null)
  const [restrictToOwn, setRestrictToOwn] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (retries = 3) => {
    if (!supabase || !user) {
      setProfile(null)
      setAccount(null)
      return
    }

    for (let i = 0; i < retries; i++) {
      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (error) {
          if (i === retries - 1) {
            setProfile(null)
            setAccount(null)
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
          }
        } else {
          setProfile(profileData)

          if (profileData?.account_id) {
            const [{ data: accountData }, meRes] = await Promise.all([
              supabase.from("accounts").select("*").eq("id", profileData.account_id).single(),
              fetch("/api/account/me"),
            ])
            const meData = meRes.ok ? await meRes.json() : null
            setAccount(accountData ?? null)
            setRole(meData?.role ?? null)
            setRestrictToOwn(meData?.restrict_to_own ?? false)
          } else {
            setAccount(null)
            setRole(null)
            setRestrictToOwn(false)
          }
          return
        }
      } catch (error) {
        if (i === retries - 1) {
          setProfile(null)
          setAccount(null)
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
          setAccount(null)
          setRole(null)
          setRestrictToOwn(false)
        }
        setLoading(false)
      })

      cleanup = () => subscription.unsubscribe()

      try {
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

  // Oppdater profil når siden blir synlig igjen
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) fetchProfile()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user, fetchProfile])

  const logout = async () => {
    if (!supabase) {
      router.replace("/login")
      return
    }
    try {
      await fetch("/api/logout", { method: "POST" })
      await supabase.auth.signOut()
      setUser(null); setProfile(null); setAccount(null)
      setRole(null); setRestrictToOwn(false)
      router.replace("/login")
    } catch (error) {
      console.error("[AuthProvider] Logout error:", error)
      setUser(null); setProfile(null); setAccount(null)
      setRole(null); setRestrictToOwn(false)
      router.replace("/login")
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    account,
    role,
    restrictToOwn,
    loading,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
