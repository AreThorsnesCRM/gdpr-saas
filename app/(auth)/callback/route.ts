export const dynamic = "force-dynamic";

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

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const { data: authUser } = await supabase
    .from("auth.users")
    .select("raw_user_meta_data")
    .eq("id", user.id)
    .single()

  const company_name = authUser?.raw_user_meta_data?.company_name ?? null
  const full_name = authUser?.raw_user_meta_data?.full_name ?? null

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!existingProfile) {
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    await supabase.from("profiles").insert({
      user_id: user.id,
      company_name,
      full_name,
      subscription_status: "trial",
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
    })
  }

  return response
}
