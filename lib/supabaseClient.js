"use client"

import { createBrowserClient } from "@supabase/ssr"

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return document.cookie
            .split("; ")
            .find((row) => row.startsWith(name + "="))
            ?.split("=")[1]
        },
        set(name, value, options) {
          let cookie = `${name}=${value}; path=/; SameSite=Lax`
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
          if (options?.expires) cookie += `; expires=${options.expires.toUTCString()}`
          document.cookie = cookie
        },
        remove(name) {
          document.cookie = `${name}=; path=/; max-age=0;`
        },
      },
    }
  )
}

export const supabase = createSupabaseBrowserClient()
