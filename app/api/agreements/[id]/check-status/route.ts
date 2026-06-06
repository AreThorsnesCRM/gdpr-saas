import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getSignatureRequest } from "@/lib/esignature"

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
    .select("account_id")
    .eq("user_id", user.id)
    .single()
  return data ? { ...data, user_id: user.id } : null
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 500 })
  const accountUser = await getAccountUser()
  if (!accountUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: agreementId } = await params

  const { data: agreement } = await supabaseAdmin
    .from("agreements")
    .select("id, customer_id, signers, signing_session_id, signing_status")
    .eq("id", agreementId)
    .single()

  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!agreement.signing_session_id) return NextResponse.json({ error: "No signing session" }, { status: 400 })
  if (agreement.signing_status === "signed") return NextResponse.json({ status: "signed" })

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
      return NextResponse.json({ status: "signed", pdfSaved: true })
    }
  }

  if (allSigned) {
    await supabaseAdmin.from("agreements").update({
      signers: updatedSigners,
      signing_status: "signed",
      signed: true,
      signed_at: new Date().toISOString(),
    }).eq("id", agreement.id)
    return NextResponse.json({ status: "signed", pdfSaved: false })
  }

  await supabaseAdmin.from("agreements").update({ signers: updatedSigners }).eq("id", agreement.id)
  return NextResponse.json({ status: "pending", signers: updatedSigners })
}
