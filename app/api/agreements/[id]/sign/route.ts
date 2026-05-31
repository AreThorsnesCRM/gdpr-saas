import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createSignatureRequest } from "@/lib/esignature"
import { sendSigningLinkEmail } from "@/lib/email"

async function getAccountUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin!
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .single()
  return data ? { ...data, user_id: user.id } : null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: agreementId } = await params
  const body = await req.json()

  // Support both old {signerName, signerEmail} and new {signers: [{name, email}]}
  const signerList: { name: string; email: string }[] = body.signers
    ? body.signers
    : [{ name: body.signerName ?? "", email: body.signerEmail ?? "" }]

  const { data: agreement } = await supabaseAdmin
    .from("agreements")
    .select("id, title, file_url, customer_id")
    .eq("id", agreementId)
    .single()

  if (!agreement) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (!agreement.file_url) return NextResponse.json({ error: "no_pdf" }, { status: 400 })

  const pdfRes = await fetch(agreement.file_url)
  if (!pdfRes.ok) return NextResponse.json({ error: "pdf_download_failed" }, { status: 500 })
  const pdfBase64 = Buffer.from(await pdfRes.arrayBuffer()).toString("base64")

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("name")
    .eq("id", accountUser.account_id)
    .single()

  const esignSigners = signerList.map(s => {
    const parts = s.name.trim().split(/\s+/)
    const firstname = parts[0] ?? s.name
    const lastname = parts.slice(1).join(" ") || "-"
    return { firstname, lastname, email: s.email }
  })

  const { idSign, signers: esignResult } = await createSignatureRequest({
    title: agreement.title,
    pdfBase64,
    signers: esignSigners,
  })

  const signersJsonb = signerList.map((s, i) => ({
    name: s.name,
    email: s.email,
    signerKey: esignResult[i]?.key ?? String(i + 1),
    url: esignResult[i]?.url ?? "",
    signed: false,
  }))

  await supabaseAdmin
    .from("agreements")
    .update({
      signing_status: "pending",
      signing_session_id: String(idSign),
      signing_url: signersJsonb[0]?.url ?? null,
      signer_name: signerList[0].name || null,
      signer_email: signerList[0].email || null,
      signers: signersJsonb,
      signing_requested_at: new Date().toISOString(),
    })
    .eq("id", agreementId)

  let emailSent = false
  for (const s of signersJsonb) {
    if (s.email) {
      await sendSigningLinkEmail(s.email, s.name, agreement.title, s.url, account?.name ?? "Pactiva")
      emailSent = true
    }
  }

  return NextResponse.json({ signatureUrl: signersJsonb[0]?.url ?? null, emailSent })
}
