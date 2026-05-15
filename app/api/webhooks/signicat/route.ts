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

  // Find agreement - first by signing_session_id (first signer), then by JSONB containment (other signers)
  let agreement: { id: string; customer_id: string; signers: any[] | null } | null = null

  const { data: bySessionId } = await supabaseAdmin
    .from("agreements")
    .select("id, customer_id, signers")
    .eq("signing_session_id", sessionId)
    .single()

  if (bySessionId) {
    agreement = bySessionId as any
  } else {
    const { data: rows } = await supabaseAdmin
      .from("agreements")
      .select("id, customer_id, signers")
      .filter("signers", "cs", JSON.stringify([{ sessionId }]))
    agreement = (rows?.[0] ?? null) as any
  }

  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 })

  const isMultiSigner = Array.isArray(agreement.signers) && agreement.signers.length > 0

  if (isMultiSigner) {
    const updatedSigners = agreement.signers!.map((s: any) =>
      s.sessionId === sessionId ? { ...s, signed: true } : s
    )
    const allSigned = updatedSigners.every((s: any) => s.signed)

    if (allSigned) {
      const session = await getSigningSession(sessionId)
      const packages = session?.output?.packages ?? []
      const pades = packages.find((p: any) => p.packageType === "PADES_CONTAINER")

      if (pades?.resultDocumentId) {
        const signedPdfBuffer = await downloadDocument(pades.resultDocumentId)
        const fileName = `${agreement.customer_id}/${agreement.id}-signed-${Date.now()}.pdf`
        const { data: upload, error: uploadError } = await supabaseAdmin.storage
          .from("agreements")
          .upload(fileName, Buffer.from(signedPdfBuffer), { contentType: "application/pdf" })

        if (!uploadError && upload) {
          const { data: urlData } = supabaseAdmin.storage.from("agreements").getPublicUrl(upload.path)
          await supabaseAdmin.from("agreements").update({
            signers: updatedSigners,
            signing_status: "signed",
            signed: true,
            signed_file_url: urlData.publicUrl,
            signed_at: new Date().toISOString(),
          }).eq("id", agreement.id)
          return NextResponse.json({ ok: true })
        }
      }

      await supabaseAdmin.from("agreements").update({
        signers: updatedSigners,
        signing_status: "signed",
        signed: true,
        signed_at: new Date().toISOString(),
      }).eq("id", agreement.id)
    } else {
      await supabaseAdmin.from("agreements").update({ signers: updatedSigners }).eq("id", agreement.id)
    }

    return NextResponse.json({ ok: true })
  }

  // Legacy single-signer path
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
  await supabaseAdmin.from("agreements").update({
    signing_status: "signed",
    signed: true,
    signed_file_url: urlData.publicUrl,
    signed_at: new Date().toISOString(),
  }).eq("id", agreement.id)

  return NextResponse.json({ ok: true })
}
