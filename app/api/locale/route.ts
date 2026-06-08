import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const validLocales = ["no", "en", "es", "sv", "da", "fi", "de", "fr", "pt"]

export async function POST(req: Request) {
  const { locale } = await req.json()
  if (!validLocales.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  })

  // Persist to DB if user is logged in
  if (supabaseAdmin) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: accountUser } = await supabaseAdmin
          .from("account_users")
          .select("account_id")
          .eq("user_id", user.id)
          .single()
        if (accountUser) {
          await supabaseAdmin
            .from("accounts")
            .update({ language: locale })
            .eq("id", accountUser.account_id)
        }
      }
    } catch {
      // Ikke blokkerende — cookie er allerede satt
    }
  }

  return response
}
