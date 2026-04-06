import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Sidebar from "./_components/sidebar"

export const metadata = {
  title: "AreCRM",
  description: "Kunde- og avtalesystem",
}

export default async function ProtectedLayout({ children }) {
  // Next.js 16: cookies() er async
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

  // 1. Hent bruker (tryggere enn getSession)
  const { data: userData } = await supabase.auth.getUser()

  if (!userData?.user) {
    redirect("/login")
  }

  const user = userData.user

  // 2. Hent profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/subscribe")
  }

  // 3. Trial / subscription sjekk
  const now = new Date()
  const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null

  const trialActive =
    profile.subscription_status === "trial" &&
    trialEnd &&
    trialEnd > now

  const subscriptionActive = profile.subscription_status === "active"

  if (!trialActive && !subscriptionActive) {
    redirect("/subscribe")
  }

  // 4. Hvis alt er OK → slipp inn
  return (
    <div className="bg-gray-100 min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64">
        {children}
      </main>
    </div>
  )
}
