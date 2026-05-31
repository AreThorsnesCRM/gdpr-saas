import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getSignatureRequest } from "@/lib/esignature"

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const body = await req.json()

  // e-signature.eu sends callback with id_sign and status_id
  const idSign = body.id_sign ?? body.result?.id_sign
  const statusId = body.status_id ?? body.result?.status_id

  if (!idSign) return NextResponse.json({ error: "No id_sign" }, { status: 400 })

  const { data: agreement } = await supabaseAdmin
    .from("agreements")
    .select("id, customer_id, signers")
    .eq("signing_session_id", String(idSign))
    .single()

  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 })

  // Fetch current state from e-signature.eu to get accurate signer statuses
  const requestData = await getSignatureRequest(idSign)
  const remoteSigners = requestData.signers ?? {}

  const currentSigners: any[] = Array.isArray(agreement.signers) ? agreement.signers : []
  const updatedSigners = currentSigners.map((s: any) => {
    const remote = remoteSigners[s.signerKey]
    return remote ? { ...s, signed: remote.status === "signed" } : s
  })

  const allSigned = updatedSigners.length > 0 && updatedSigners.every((s: any) => s.signed)

  if (allSigned && requestData.pdfBase64) {
    const pdfBuffer = Buffer.from(requestData.pdfBase64, "base64")
    const fileName = `${agreement.customer_id}/${agreement.id}-signed-${Date.now()}.pdf`
    const { data: upload, error: uploadError } = await supabaseAdmin.storage
      .from("agreements")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf" })

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

  if (allSigned) {
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
