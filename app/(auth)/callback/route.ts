import { NextResponse } from "next/server"
import { createServerClientInstance } from "@/lib/supabaseServer"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")

  if (code) {
    const supabase = createServerClientInstance()
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.redirect(new URL("/login", request.url))
}
