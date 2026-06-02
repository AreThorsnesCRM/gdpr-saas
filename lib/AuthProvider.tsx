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

  const refreshAccount = useCallback(async () => {
    const res = await fetch("/api/account/context")
    if (!res.ok) return
    const data = await res.json()
    if (data.account) setAccount(data.account as Account)
    if (data.role) setRole(data.role as "admin" | "member")
    setRestrictToOwn(data.restrict_to_own ?? false)
  }, [])

  const fetchProfile = useCallback(async (retries = 3) => {
    if (!supabase || !user) {
      setProfile(null)
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
          if (i === retries - 1) setProfile(null)
          else await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        } else {
          setProfile(profileData)
          return
        }
      } catch {
        if (i === retries - 1) setProfile(null)
        else await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setAccount(null)
      setRole(null)
      setRestrictToOwn(false)
      return
    }
    fetchProfile()
    refreshAccount()
  }, [user, fetchProfile, refreshAccount])

  // Initialisér session på mount
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Lytt på auth-endringer — settes opp FØR init så ingen events misses
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    async function init() {
      // Håndter temp_session-cookie fra callback — await setSession før getSession
      const allCookies = document.cookie.split('; ')
      const tempParts = allCookies
        .filter(row => row.startsWith('temp_session=') || row.startsWith('temp_session.'))
        .sort()
      if (tempParts.length > 0) {
        const rawValue = tempParts.map(p => p.split('=').slice(1).join('=')).join('')
        try {
          const sessionData = JSON.parse(decodeURIComponent(rawValue))
          await supabase!.auth.setSession(sessionData)
        } catch (error) {
          console.error("[AuthProvider] Failed to set temp session:", error)
        }
        // Fjern alle temp_session-cookies
        tempParts.forEach(p => {
          const name = p.split('=')[0]
          document.cookie = `${name}=; path=/; maxAge=0`
        })
      }

      // Hent sesjon — setSession er nå fullført
      const { data: { session } } = await supabase!.auth.getSession()
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email })
      }
      setLoading(false)
    }

    init()

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) refreshAccount()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user, refreshAccount])

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" })
      if (supabase) await supabase.auth.signOut()
    } catch (error) {
      console.error("[AuthProvider] Logout error:", error)
    } finally {
      // Hard redirect sikrer at AuthProvider starter helt på nytt
      window.location.href = "/login"
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
    refreshAccount,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
