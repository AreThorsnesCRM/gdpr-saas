import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getSignatureRequest } from "@/lib/esignature"


async function processSigningSession(idSign: string | number) {
  if (!supabaseAdmin) return { error: "Not configured" }

  const { data: agreement } = await supabaseAdmin
    .from("agreements")
    .select("id, customer_id, signers, signing_status")
    .eq("signing_session_id", String(idSign))
    .single()

  if (!agreement) return { error: "Agreement not found" }
  if (agreement.signing_status === "signed") return { ok: true, alreadySigned: true }

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
      return { ok: true }
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

  return { ok: true }
}

// e-signature.eu may verify the endpoint with GET before sending callbacks
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const idSign = searchParams.get("id_sign") ?? searchParams.get("idSign")

  if (idSign) {
    try {
      const result = await processSigningSession(idSign)
      return NextResponse.json(result)
    } catch (err: any) {
      console.error("esignature GET webhook error:", err?.message)
      return NextResponse.json({ error: err?.message }, { status: 500 })
    }
  }

  // Health check — return 200 so e-signature.eu knows the endpoint is reachable
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // Body too large or not JSON — try reading id_sign from URL
  }

  const { searchParams } = new URL(req.url)
  const idSign =
    body.id_sign ?? body.result?.id_sign ??
    searchParams.get("id_sign") ?? searchParams.get("idSign")

  if (!idSign) return NextResponse.json({ error: "No id_sign" }, { status: 400 })

  try {
    const result = await processSigningSession(idSign)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("esignature POST webhook error:", err?.message)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
