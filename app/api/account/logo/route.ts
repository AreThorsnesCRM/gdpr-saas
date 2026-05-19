import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"

async function getAuthedAdmin(requiredRole = "admin") {
  if (!supabaseAdmin) return null

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: accountUser } = await supabaseAdmin
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .single()

  if (!accountUser) return null
  if (requiredRole === "admin" && accountUser.role !== "admin") return null

  return { accountId: accountUser.account_id as string, role: accountUser.role as string }
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const auth = await getAuthedAdmin()
  if (!auth) return NextResponse.json({ error: "Kun admin kan laste opp logo" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("logo") as File | null
  if (!file) return NextResponse.json({ error: "Ingen fil" }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png"
  if (!["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Ugyldig filtype" }, { status: 400 })
  }

  const path = `logos/${auth.accountId}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from("agreements")
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from("agreements").getPublicUrl(path)
  const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`

  await supabaseAdmin.from("accounts").update({ logo_url: urlData.publicUrl }).eq("id", auth.accountId)

  return NextResponse.json({ logo_url: logoUrl })
}

export async function DELETE() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const auth = await getAuthedAdmin()
  if (!auth) return NextResponse.json({ error: "Kun admin kan fjerne logo" }, { status: 403 })

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("logo_url")
    .eq("id", auth.accountId)
    .single()

  if (account?.logo_url) {
    try {
      const url = new URL(account.logo_url)
      const match = url.pathname.match(/\/storage\/v1\/object\/public\/agreements\/(.+)$/)
      if (match) {
        await supabaseAdmin.storage.from("agreements").remove([match[1]])
      }
    } catch {
      // URL-parsing feilet, fortsett uansett
    }
  }

  await supabaseAdmin.from("accounts").update({ logo_url: null }).eq("id", auth.accountId)

  return NextResponse.json({ success: true })
}
