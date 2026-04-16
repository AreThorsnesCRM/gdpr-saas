import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Sidebar from "./_components/sidebar"
import Header from "./_components/Header"
import React from "react"

export const metadata = {
  title: "AreCRM",
  description: "Kunde- og avtalesystem",
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set(name, value, options)
        },
        remove(name, options) {
          cookieStore.set(name, "", { ...options, maxAge: 0 })
        },
      },
    }
  )

  const { data: userData } = await supabase.auth.getUser()

  if (!userData?.user) {
    redirect("/login")
  }

  const user = userData.user

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!profile) {
    redirect("/subscribe")
  }

  const now = new Date()
  const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null

  const trialActive =
    profile.subscription_status === "trialing" &&
    trialEnd &&
    trialEnd > now

  const subscriptionActive = profile.subscription_status === "active"

  if (!trialActive && !subscriptionActive) {
    redirect("/subscribe")
  }

  return (
    <div className="bg-gray-100 min-h-screen flex">
      {/* Nå sender vi profile inn i Sidebar */}
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        {/* Og inn i Header */}
        <Header />

        {/* Og videre til dashboard/page.tsx */}
        {children}
      </main>
    </div>
  )
}
