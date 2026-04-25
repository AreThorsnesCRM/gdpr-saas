import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
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

  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error("[logout] Supabase signOut error:", error)
  }

  const response = NextResponse.json({ success: true })
  const secure = process.env.NODE_ENV === "production"

  response.cookies.set("sb-access-token", "", {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 0,
  })

  response.cookies.set("sb-refresh-token", "", {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 0,
  })

  return response
}
