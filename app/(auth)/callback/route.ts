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
    return response
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

  return response
}


  // Hvis noe mangler → send til login
  return NextResponse.redirect(new URL("/login", request.url))
}
