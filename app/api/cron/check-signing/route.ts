import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getSignatureRequest } from "@/lib/esignature"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const { data: pending } = await supabaseAdmin
    .from("agreements")
    .select("id, customer_id, signers, signing_session_id")
    .eq("signing_status", "pending")

  if (!pending?.length) return NextResponse.json({ checked: 0 })

  let updated = 0

  for (const agreement of pending) {
    if (!agreement.signing_session_id) continue

    try {
      const requestData = await getSignatureRequest(agreement.signing_session_id)
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
          updated++
          continue
        }
      }

      if (allSigned) {
        await supabaseAdmin.from("agreements").update({
          signers: updatedSigners,
          signing_status: "signed",
          signed: true,
          signed_at: new Date().toISOString(),
        }).eq("id", agreement.id)
        updated++
      } else {
        await supabaseAdmin.from("agreements").update({ signers: updatedSigners }).eq("id", agreement.id)
      }
    } catch (err: any) {
      console.error(`check-signing error for ${agreement.id}:`, err?.message)
    }
  }

  return NextResponse.json({ checked: pending.length, updated })
}
