import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const token = url.searchParams.get("token")
  const type = url.searchParams.get("type")

  const response = NextResponse.redirect(
    new URL("/dashboard", request.url)
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 1. Magic link / OAuth / password reset
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 2. Email verification
  if (token && type === "signup") {
    const email = url.searchParams.get("email")

    if (email) {
      await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      })
    }
  }

  // 3. Nå er brukeren logget inn → hent user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // 4. Sjekk om profil finnes
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  // 5. Opprett profil hvis den ikke finnes
  if (!existingProfile) {
    await supabase.from("profiles").insert({
      user_id: user.id,
      company_name: null, // du kan fylle inn fra metadata senere
      subscription_status: "trial",
      trial_start: new Date().toISOString(),
      trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  return response
}
