import { NextResponse } from "next/server"

export async function POST() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout`,
    {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      credentials: "include",
    }
  )

  const response = NextResponse.json({ success: true })

  // Kopier cookies fra Supabase → Next.js → Browser
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("set-cookie", value)
    }
  })

  return response
}
