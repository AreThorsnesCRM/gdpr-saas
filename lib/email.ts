import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = "AreCRM <onboarding@resend.dev>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

export async function sendTrialEndingEmail(to: string, name: string, daysLeft: number) {
  if (!resend) return
  const timeLeft = daysLeft === 14 ? "2 uker" : daysLeft === 7 ? "1 uke" : `${daysLeft} dager`
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Prøveperioden din utløper om ${timeLeft}`,
    html: `
      <p>Hei ${name},</p>
      <p>Prøveperioden din i AreCRM utløper om <strong>${timeLeft}</strong>.</p>
      <p>For å fortsette uten avbrudd, start et abonnement nå.</p>
      <p><a href="${APP_URL}/settings" style="${btnStyle("#2563eb")}">Start abonnement</a></p>
      <p style="${footerStyle}">Du kan slå av disse varslene under Innstillinger i AreCRM.</p>
    `,
  })
}

export async function sendPaymentFailedEmail(to: string, name: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Betalingen din feilet — handling kreves",
    html: `
      <p>Hei ${name},</p>
      <p>Vi klarte dessverre ikke å trekke betalingen for abonnementet ditt i AreCRM.</p>
      <p>Vennligst oppdater betalingsinformasjonen for å unngå avbrudd.</p>
      <p><a href="${APP_URL}/settings" style="${btnStyle("#dc2626")}">Oppdater betalingsinfo</a></p>
      <p style="${footerStyle}">Du kan slå av disse varslene under Innstillinger i AreCRM.</p>
    `,
  })
}

export async function sendExpiringAgreementEmail(
  to: string,
  name: string,
  customerName: string,
  agreementTitle: string,
  daysLeft: number
) {
  if (!resend) return
  const daysText = daysLeft === 1 ? "1 dag" : `${daysLeft} dager`
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Avtale utløper om ${daysText} — ${customerName}`,
    html: `
      <p>Hei ${name},</p>
      <p>Avtalen <strong>${agreementTitle}</strong> med <strong>${customerName}</strong> utløper om <strong>${daysText}</strong>.</p>
      <p>Gå inn på kunden for å fornye eller arkivere avtalen.</p>
      <p><a href="${APP_URL}/customers" style="${btnStyle("#1e293b")}">Åpne AreCRM</a></p>
      <p style="${footerStyle}">Du kan slå av disse varslene under Innstillinger → Varsler.</p>
    `,
  })
}

export async function sendAgreementExpiredEmail(
  to: string,
  name: string,
  customerName: string,
  agreementTitle: string
) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Kunde uten aktiv avtale — ${customerName}`,
    html: `
      <p>Hei ${name},</p>
      <p>Avtalen <strong>${agreementTitle}</strong> med <strong>${customerName}</strong> utløp i går, og kunden har nå ingen aktive avtaler.</p>
      <p>Vurder om det er behov for å opprette en ny avtale.</p>
      <p><a href="${APP_URL}/customers" style="${btnStyle("#1e293b")}">Åpne AreCRM</a></p>
      <p style="${footerStyle}">Du kan slå av disse varslene under Innstillinger → Varsler.</p>
    `,
  })
}

const btnStyle = (bg: string) =>
  `background:${bg};color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px`

const footerStyle =
  "margin-top:24px;color:#6b7280;font-size:14px"
