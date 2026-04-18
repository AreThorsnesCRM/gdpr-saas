"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AgreementsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filter, setFilter] = useState<
    "all" | "active" | "expired" | "upcoming" | "archived" | "expiresSoon"
  >("all")

  const [agreements, setAgreements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 1. Vent på session før vi henter data
  async function waitForSession() {
    let session = null

    while (!session) {
      const { data } = await supabase.auth.getSession()
      session = data.session
      if (!session) await new Promise((r) => setTimeout(r, 50))
    }

    return session
  }

  useEffect(() => {
    async function fetchAgreements() {
      setLoading(true)

      // 2. Vent på session
      await waitForSession()

      // 3. Hent avtaler
      const { data, error } = await supabase
        .from("agreements")
        .select("*, customers(name)")
        .order("start_date", { ascending: true })

      if (!error && data) {
        setAgreements(data)
      }

      setLoading(false)
    }

    fetchAgreements()
  }, [])
