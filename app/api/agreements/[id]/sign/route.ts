import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createSignatureRequest } from "@/lib/esignature"
import { sendSigningLinkEmail } from "@/lib/email"
import { getMethodCost, deductCredits, triggerAutoTopup } from "@/lib/signing-credits"

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

  const signerList: { name: string; email: string }[] = body.signers
    ? body.signers
    : [{ name: body.signerName ?? "", email: body.signerEmail ?? "" }]

  const methodOverride: string | undefined = body.method

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

  const requestCookies = await cookies()
  const locale = requestCookies.get("NEXT_LOCALE")?.value ?? "no"

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("name, signing_method, subscription_status, signings_credits_included, signings_credits_purchased")
    .eq("id", accountUser.account_id)
    .single()

  // Blokkér prøveperiode-brukere
  if (!account || account.subscription_status === "trialing") {
    return NextResponse.json({ error: "trial_blocked" }, { status: 403 })
  }

  // Sjekk kredittbalanse
  const resolvedMethod = methodOverride ?? account.signing_method ?? "otp-email-non-qualified"
  const cost = getMethodCost(resolvedMethod)
  const total = (account.signings_credits_included ?? 0) + (account.signings_credits_purchased ?? 0)
  if (total < cost) {
    return NextResponse.json({ error: "insufficient_credits", cost, balance: total }, { status: 402 })
  }

  const esignSigners = signerList.map(s => {
    const parts = s.name.trim().split(/\s+/)
    const firstname = parts[0] ?? s.name
    const lastname = parts.slice(1).join(" ") || "-"
    return { firstname, lastname, email: s.email }
  })

  let idSign: number
  let esignResult: { key: string; url: string }[]
  try {
    const result = await createSignatureRequest({
      title: agreement.title,
      pdfBase64,
      signers: esignSigners,
      method: methodOverride ?? account?.signing_method ?? undefined,
    })
    idSign = result.idSign
    esignResult = result.signers
  } catch (err: any) {
    console.error("e-signature.eu feil:", err?.message)
    return NextResponse.json({ error: err?.message ?? "esign_failed" }, { status: 500 })
  }

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
      await sendSigningLinkEmail(s.email, s.name, agreement.title, s.url, account.name ?? "Pactiva", locale)
      emailSent = true
    }
  }

  // Trekk fra kreditter etter vellykket signering
  const { remaining } = await deductCredits(accountUser.account_id, cost)

  // Auto-topup når saldo er 1
  if (remaining === 1) {
    const { data: adminUser } = await supabaseAdmin
      .from("account_users")
      .select("user_id")
      .eq("account_id", accountUser.account_id)
      .eq("role", "admin")
      .single()
    if (adminUser) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("user_id", adminUser.user_id)
        .single()
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(adminUser.user_id)
      const adminEmail = authData?.user?.email ?? ""
      // Fire-and-forget
      triggerAutoTopup(accountUser.account_id, adminEmail, profile?.full_name ?? "").catch(console.error)
    }
  }

  return NextResponse.json({ signatureUrl: signersJsonb[0]?.url ?? null, emailSent })
}
