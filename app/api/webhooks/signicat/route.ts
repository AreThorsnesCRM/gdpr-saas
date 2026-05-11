import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getSigningSession, downloadDocument } from "@/lib/signicat"

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const body = await req.json()

  if (body.eventName !== "package.completed") {
    return NextResponse.json({ ok: true })
  }

  const sessionId = body.eventData?.id
  if (!sessionId) return NextResponse.json({ error: "No session ID" }, { status: 400 })

  const { data: agreement } = await supabaseAdmin
    .from("agreements")
    .select("id, customer_id")
    .eq("signing_session_id", sessionId)
    .single()

  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 })

  const session = await getSigningSession(sessionId)
  const packages = session?.output?.packages ?? []
  const pades = packages.find((p: any) => p.packageType === "PADES_CONTAINER")
  if (!pades?.resultDocumentId) return NextResponse.json({ error: "No signed document" }, { status: 400 })

  const signedPdfBuffer = await downloadDocument(pades.resultDocumentId)

  const fileName = `${agreement.customer_id}/${agreement.id}-signed-${Date.now()}.pdf`
  const { data: upload, error: uploadError } = await supabaseAdmin.storage
    .from("agreements")
    .upload(fileName, Buffer.from(signedPdfBuffer), { contentType: "application/pdf" })

  if (uploadError || !upload) {
    return NextResponse.json({ error: "Storage upload failed" }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from("agreements").getPublicUrl(upload.path)

  await supabaseAdmin
    .from("agreements")
    .update({
      signing_status: "signed",
      signed_file_url: urlData.publicUrl,
      signed_at: new Date().toISOString(),
    })
    .eq("id", agreement.id)

  return NextResponse.json({ ok: true })
}
