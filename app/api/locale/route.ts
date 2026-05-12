import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { locale } = await req.json()
  const validLocales = ["no", "en", "es"]
  if (!validLocales.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  })
  return response
}
