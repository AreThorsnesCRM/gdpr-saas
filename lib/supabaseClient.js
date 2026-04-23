"use client"

import { createBrowserClient } from "@supabase/ssr"

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll() {
        if (typeof document === "undefined") return []

        return document.cookie.split("; ").map((cookie) => {
          const [name, ...rest] = cookie.split("=")
          const value = rest.join("=")
          return { name, value }
        })
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return

        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieString = `${name}=${value}; path=${options?.path || "/"}; max-age=${options?.maxAge || 31536000}`
          document.cookie = cookieString
        })
      },
    },
  }
)

