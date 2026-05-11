import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { uploadDocument, createDocumentCollection, createSigningSession } from "@/lib/signicat"
import { randomUUID } from "crypto"

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
  const { signerName, signerEmail } = await req.json()

  const { data: agreement } = await supabaseAdmin
    .from("agreements")
    .select("id, title, file_url, customer_id")
    .eq("id", agreementId)
    .single()

  if (!agreement) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (!agreement.file_url) return NextResponse.json({ error: "no_pdf" }, { status: 400 })

  const pdfRes = await fetch(agreement.file_url)
  if (!pdfRes.ok) return NextResponse.json({ error: "pdf_download_failed" }, { status: 500 })
  const pdfBuffer = await pdfRes.arrayBuffer()

  const documentId = await uploadDocument(pdfBuffer)
  const documentCollectionId = await createDocumentCollection(documentId)
  const externalReference = randomUUID()

  const { sessionId, signatureUrl } = await createSigningSession({
    documentCollectionId,
    documentId,
    title: agreement.title,
    externalReference,
    language: "nb",
  })

  await supabaseAdmin
    .from("agreements")
    .update({
      signing_status: "pending",
      signing_session_id: sessionId,
      signing_url: signatureUrl,
      signer_name: signerName || null,
      signer_email: signerEmail || null,
      signing_requested_at: new Date().toISOString(),
    })
    .eq("id", agreementId)

  return NextResponse.json({ signatureUrl, sessionId })
}
