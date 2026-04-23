import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { email, password } = await req.json()

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.set(name, "", { ...options, maxAge: 0 })
        },
      },
    }
  )

  // 1. Logg inn
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 2. Verifiser bruker
  await supabase.auth.getUser()

  // 3. Hent session og sett cookies manuelt (sikrer at de blir sendt til klient)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = NextResponse.json({ success: true })

  // 4. Sett cookies manuelt på response (sikrer at de blir sendt til browser)
  if (session) {
    response.cookies.set("sb-access-token", session.access_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    })

    response.cookies.set("sb-refresh-token", session.refresh_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    })
  }

  return response
}
