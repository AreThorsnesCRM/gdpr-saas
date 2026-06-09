import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = "Pactiva <support@pactiva.io>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

type Locale = "no" | "en" | "sv" | "da" | "fi" | "de" | "fr" | "es" | "pt"

function t(locale: string): Locale {
  const valid: Locale[] = ["no", "en", "sv", "da", "fi", "de", "fr", "es", "pt"]
  return valid.includes(locale as Locale) ? (locale as Locale) : "no"
}

// ── Oversettelser ─────────────────────────────────────────────────────────────

const translations = {
  greeting: {
    no: (name: string) => `Hei${name ? ` ${name}` : ""},`,
    en: (name: string) => `Hi${name ? ` ${name}` : ""},`,
    sv: (name: string) => `Hej${name ? ` ${name}` : ""},`,
    da: (name: string) => `Hej${name ? ` ${name}` : ""},`,
    fi: (name: string) => `Hei${name ? ` ${name}` : ""},`,
    de: (name: string) => `Hallo${name ? ` ${name}` : ""},`,
    fr: (name: string) => `Bonjour${name ? ` ${name}` : ""},`,
    es: (name: string) => `Hola${name ? ` ${name}` : ""},`,
    pt: (name: string) => `Olá${name ? ` ${name}` : ""},`,
  },
  trial: {
    no: {
      timeLeft: (d: number) => d === 14 ? "2 uker" : d === 7 ? "1 uke" : `${d} dager`,
      subject: (t: string) => `Prøveperioden din utløper om ${t}`,
      body: (name: string, t: string) => `<p>Prøveperioden din i Pactiva utløper om <strong>${t}</strong>.</p><p>For å fortsette uten avbrudd, start et abonnement nå.</p>`,
      btn: "Start abonnement",
      footer: "Du kan slå av disse varslene under Innstillinger i Pactiva.",
    },
    en: {
      timeLeft: (d: number) => d === 14 ? "2 weeks" : d === 7 ? "1 week" : `${d} days`,
      subject: (t: string) => `Your trial expires in ${t}`,
      body: (name: string, t: string) => `<p>Your trial period in Pactiva expires in <strong>${t}</strong>.</p><p>To continue without interruption, start a subscription now.</p>`,
      btn: "Start subscription",
      footer: "You can disable these notifications under Settings in Pactiva.",
    },
    sv: {
      timeLeft: (d: number) => d === 14 ? "2 veckor" : d === 7 ? "1 vecka" : `${d} dagar`,
      subject: (t: string) => `Din provperiod löper ut om ${t}`,
      body: (name: string, t: string) => `<p>Din provperiod i Pactiva löper ut om <strong>${t}</strong>.</p><p>För att fortsätta utan avbrott, starta en prenumeration nu.</p>`,
      btn: "Starta prenumeration",
      footer: "Du kan stänga av dessa aviseringar under Inställningar i Pactiva.",
    },
    da: {
      timeLeft: (d: number) => d === 14 ? "2 uger" : d === 7 ? "1 uge" : `${d} dage`,
      subject: (t: string) => `Din prøveperiode udløber om ${t}`,
      body: (name: string, t: string) => `<p>Din prøveperiode i Pactiva udløber om <strong>${t}</strong>.</p><p>For at fortsætte uden afbrydelse, start et abonnement nu.</p>`,
      btn: "Start abonnement",
      footer: "Du kan slå disse meddelelser fra under Indstillinger i Pactiva.",
    },
    fi: {
      timeLeft: (d: number) => d === 14 ? "2 viikkoa" : d === 7 ? "1 viikko" : `${d} päivää`,
      subject: (t: string) => `Kokeilujaksosi päättyy ${t} kuluttua`,
      body: (name: string, t: string) => `<p>Kokeilujaksosi Pactiva-palvelussa päättyy <strong>${t}</strong> kuluttua.</p><p>Aloita tilaus jatkaaksesi ilman keskeytystä.</p>`,
      btn: "Aloita tilaus",
      footer: "Voit poistaa nämä ilmoitukset käytöstä Pacti­van asetuksista.",
    },
    de: {
      timeLeft: (d: number) => d === 14 ? "2 Wochen" : d === 7 ? "1 Woche" : `${d} Tagen`,
      subject: (t: string) => `Ihr Testzeitraum läuft in ${t} ab`,
      body: (name: string, t: string) => `<p>Ihr Testzeitraum bei Pactiva läuft in <strong>${t}</strong> ab.</p><p>Starten Sie jetzt ein Abonnement, um ohne Unterbrechung fortzufahren.</p>`,
      btn: "Abonnement starten",
      footer: "Sie können diese Benachrichtigungen unter Einstellungen in Pactiva deaktivieren.",
    },
    fr: {
      timeLeft: (d: number) => d === 14 ? "2 semaines" : d === 7 ? "1 semaine" : `${d} jours`,
      subject: (t: string) => `Votre période d'essai expire dans ${t}`,
      body: (name: string, t: string) => `<p>Votre période d'essai dans Pactiva expire dans <strong>${t}</strong>.</p><p>Pour continuer sans interruption, commencez un abonnement maintenant.</p>`,
      btn: "Commencer l'abonnement",
      footer: "Vous pouvez désactiver ces notifications dans les Paramètres de Pactiva.",
    },
    es: {
      timeLeft: (d: number) => d === 14 ? "2 semanas" : d === 7 ? "1 semana" : `${d} días`,
      subject: (t: string) => `Tu período de prueba expira en ${t}`,
      body: (name: string, t: string) => `<p>Tu período de prueba en Pactiva expira en <strong>${t}</strong>.</p><p>Para continuar sin interrupciones, inicia una suscripción ahora.</p>`,
      btn: "Iniciar suscripción",
      footer: "Puedes desactivar estas notificaciones en Configuración de Pactiva.",
    },
    pt: {
      timeLeft: (d: number) => d === 14 ? "2 semanas" : d === 7 ? "1 semana" : `${d} dias`,
      subject: (t: string) => `O seu período de teste expira em ${t}`,
      body: (name: string, t: string) => `<p>O seu período de teste no Pactiva expira em <strong>${t}</strong>.</p><p>Para continuar sem interrupções, inicie uma assinatura agora.</p>`,
      btn: "Iniciar assinatura",
      footer: "Pode desativar estas notificações em Definições no Pactiva.",
    },
  },
  payment: {
    no: {
      subject: "Betalingen din feilet — handling kreves",
      body: "Vi klarte dessverre ikke å trekke betalingen for abonnementet ditt i Pactiva.<br>Vennligst oppdater betalingsinformasjonen for å unngå avbrudd.",
      btn: "Oppdater betalingsinfo",
      footer: "Du kan slå av disse varslene under Innstillinger i Pactiva.",
    },
    en: {
      subject: "Your payment failed — action required",
      body: "Unfortunately, we were unable to process your Pactiva subscription payment.<br>Please update your payment details to avoid interruption.",
      btn: "Update payment info",
      footer: "You can disable these notifications under Settings in Pactiva.",
    },
    sv: {
      subject: "Din betalning misslyckades — åtgärd krävs",
      body: "Tyvärr kunde vi inte behandla din Pactiva-prenumerationsbetalning.<br>Uppdatera din betalningsinformation för att undvika avbrott.",
      btn: "Uppdatera betalningsinformation",
      footer: "Du kan stänga av dessa aviseringar under Inställningar i Pactiva.",
    },
    da: {
      subject: "Din betaling fejlede — handling påkrævet",
      body: "Vi kunne desværre ikke behandle din Pactiva-abonnementsbetaling.<br>Opdater venligst dine betalingsoplysninger for at undgå afbrydelse.",
      btn: "Opdater betalingsoplysninger",
      footer: "Du kan slå disse meddelelser fra under Indstillinger i Pactiva.",
    },
    fi: {
      subject: "Maksusi epäonnistui — toimenpide vaaditaan",
      body: "Valitettavasti emme pystyneet veloittamaan Pactiva-tilausmaksuasi.<br>Päivitä maksutietosi välttääksesi keskeytyksen.",
      btn: "Päivitä maksutiedot",
      footer: "Voit poistaa nämä ilmoitukset käytöstä Pacti­van asetuksista.",
    },
    de: {
      subject: "Ihre Zahlung ist fehlgeschlagen — Aktion erforderlich",
      body: "Leider konnten wir Ihre Pactiva-Abonnementzahlung nicht verarbeiten.<br>Bitte aktualisieren Sie Ihre Zahlungsdaten, um Unterbrechungen zu vermeiden.",
      btn: "Zahlungsdaten aktualisieren",
      footer: "Sie können diese Benachrichtigungen unter Einstellungen in Pactiva deaktivieren.",
    },
    fr: {
      subject: "Votre paiement a échoué — action requise",
      body: "Malheureusement, nous n'avons pas pu traiter votre paiement d'abonnement Pactiva.<br>Veuillez mettre à jour vos informations de paiement pour éviter toute interruption.",
      btn: "Mettre à jour les informations de paiement",
      footer: "Vous pouvez désactiver ces notifications dans les Paramètres de Pactiva.",
    },
    es: {
      subject: "Tu pago falló — acción requerida",
      body: "Lamentablemente, no pudimos procesar tu pago de suscripción a Pactiva.<br>Por favor, actualiza tu información de pago para evitar interrupciones.",
      btn: "Actualizar información de pago",
      footer: "Puedes desactivar estas notificaciones en Configuración de Pactiva.",
    },
    pt: {
      subject: "O seu pagamento falhou — ação necessária",
      body: "Infelizmente, não conseguimos processar o pagamento da sua assinatura Pactiva.<br>Por favor, atualize as suas informações de pagamento para evitar interrupções.",
      btn: "Atualizar informações de pagamento",
      footer: "Pode desativar estas notificações em Definições no Pactiva.",
    },
  },
  expiring: {
    no: {
      daysText: (d: number) => d === 1 ? "1 dag" : `${d} dager`,
      subject: (days: string, customer: string) => `Avtale utløper om ${days} — ${customer}`,
      body: (title: string, customer: string, days: string) => `Avtalen <strong>${title}</strong> med <strong>${customer}</strong> utløper om <strong>${days}</strong>.<br>Gå inn på kunden for å fornye eller arkivere avtalen.`,
      btn: "Åpne Pactiva",
      footer: "Du kan slå av disse varslene under Innstillinger → Varsler.",
    },
    en: {
      daysText: (d: number) => d === 1 ? "1 day" : `${d} days`,
      subject: (days: string, customer: string) => `Agreement expires in ${days} — ${customer}`,
      body: (title: string, customer: string, days: string) => `The agreement <strong>${title}</strong> with <strong>${customer}</strong> expires in <strong>${days}</strong>.<br>Open the customer to renew or archive the agreement.`,
      btn: "Open Pactiva",
      footer: "You can disable these notifications under Settings → Notifications.",
    },
    sv: {
      daysText: (d: number) => d === 1 ? "1 dag" : `${d} dagar`,
      subject: (days: string, customer: string) => `Avtal löper ut om ${days} — ${customer}`,
      body: (title: string, customer: string, days: string) => `Avtalet <strong>${title}</strong> med <strong>${customer}</strong> löper ut om <strong>${days}</strong>.<br>Öppna kunden för att förnya eller arkivera avtalet.`,
      btn: "Öppna Pactiva",
      footer: "Du kan stänga av dessa aviseringar under Inställningar → Aviseringar.",
    },
    da: {
      daysText: (d: number) => d === 1 ? "1 dag" : `${d} dage`,
      subject: (days: string, customer: string) => `Aftale udløber om ${days} — ${customer}`,
      body: (title: string, customer: string, days: string) => `Aftalen <strong>${title}</strong> med <strong>${customer}</strong> udløber om <strong>${days}</strong>.<br>Åbn kunden for at forny eller arkivere aftalen.`,
      btn: "Åbn Pactiva",
      footer: "Du kan slå disse meddelelser fra under Indstillinger → Notifikationer.",
    },
    fi: {
      daysText: (d: number) => d === 1 ? "1 päivä" : `${d} päivää`,
      subject: (days: string, customer: string) => `Sopimus päättyy ${days} kuluttua — ${customer}`,
      body: (title: string, customer: string, days: string) => `Sopimus <strong>${title}</strong> asiakkaan <strong>${customer}</strong> kanssa päättyy <strong>${days}</strong> kuluttua.<br>Avaa asiakas uudistaaksesi tai arkistoidaksesi sopimuksen.`,
      btn: "Avaa Pactiva",
      footer: "Voit poistaa nämä ilmoitukset käytöstä Asetukset → Ilmoitukset.",
    },
    de: {
      daysText: (d: number) => d === 1 ? "1 Tag" : `${d} Tagen`,
      subject: (days: string, customer: string) => `Vertrag läuft in ${days} ab — ${customer}`,
      body: (title: string, customer: string, days: string) => `Der Vertrag <strong>${title}</strong> mit <strong>${customer}</strong> läuft in <strong>${days}</strong> ab.<br>Öffnen Sie den Kunden, um den Vertrag zu verlängern oder zu archivieren.`,
      btn: "Pactiva öffnen",
      footer: "Sie können diese Benachrichtigungen unter Einstellungen → Benachrichtigungen deaktivieren.",
    },
    fr: {
      daysText: (d: number) => d === 1 ? "1 jour" : `${d} jours`,
      subject: (days: string, customer: string) => `Contrat expire dans ${days} — ${customer}`,
      body: (title: string, customer: string, days: string) => `Le contrat <strong>${title}</strong> avec <strong>${customer}</strong> expire dans <strong>${days}</strong>.<br>Ouvrez le client pour renouveler ou archiver le contrat.`,
      btn: "Ouvrir Pactiva",
      footer: "Vous pouvez désactiver ces notifications dans Paramètres → Notifications.",
    },
    es: {
      daysText: (d: number) => d === 1 ? "1 día" : `${d} días`,
      subject: (days: string, customer: string) => `Contrato expira en ${days} — ${customer}`,
      body: (title: string, customer: string, days: string) => `El contrato <strong>${title}</strong> con <strong>${customer}</strong> expira en <strong>${days}</strong>.<br>Abre el cliente para renovar o archivar el contrato.`,
      btn: "Abrir Pactiva",
      footer: "Puedes desactivar estas notificaciones en Configuración → Notificaciones.",
    },
    pt: {
      daysText: (d: number) => d === 1 ? "1 dia" : `${d} dias`,
      subject: (days: string, customer: string) => `Contrato expira em ${days} — ${customer}`,
      body: (title: string, customer: string, days: string) => `O contrato <strong>${title}</strong> com <strong>${customer}</strong> expira em <strong>${days}</strong>.<br>Abra o cliente para renovar ou arquivar o contrato.`,
      btn: "Abrir Pactiva",
      footer: "Pode desativar estas notificações em Definições → Notificações.",
    },
  },
  expired: {
    no: {
      subject: (customer: string) => `Kunde uten aktiv avtale — ${customer}`,
      body: (title: string, customer: string) => `Avtalen <strong>${title}</strong> med <strong>${customer}</strong> utløp i går, og kunden har nå ingen aktive avtaler.<br>Vurder om det er behov for å opprette en ny avtale.`,
      btn: "Åpne Pactiva",
      footer: "Du kan slå av disse varslene under Innstillinger → Varsler.",
    },
    en: {
      subject: (customer: string) => `Customer without active agreement — ${customer}`,
      body: (title: string, customer: string) => `The agreement <strong>${title}</strong> with <strong>${customer}</strong> expired yesterday, and the customer now has no active agreements.<br>Consider whether a new agreement needs to be created.`,
      btn: "Open Pactiva",
      footer: "You can disable these notifications under Settings → Notifications.",
    },
    sv: {
      subject: (customer: string) => `Kund utan aktivt avtal — ${customer}`,
      body: (title: string, customer: string) => `Avtalet <strong>${title}</strong> med <strong>${customer}</strong> löpte ut igår och kunden har nu inga aktiva avtal.<br>Överväg om ett nytt avtal behöver skapas.`,
      btn: "Öppna Pactiva",
      footer: "Du kan stänga av dessa aviseringar under Inställningar → Aviseringar.",
    },
    da: {
      subject: (customer: string) => `Kunde uden aktiv aftale — ${customer}`,
      body: (title: string, customer: string) => `Aftalen <strong>${title}</strong> med <strong>${customer}</strong> udløb i går, og kunden har nu ingen aktive aftaler.<br>Overvej om der er behov for at oprette en ny aftale.`,
      btn: "Åbn Pactiva",
      footer: "Du kan slå disse meddelelser fra under Indstillinger → Notifikationer.",
    },
    fi: {
      subject: (customer: string) => `Asiakas ilman voimassa olevaa sopimusta — ${customer}`,
      body: (title: string, customer: string) => `Sopimus <strong>${title}</strong> asiakkaan <strong>${customer}</strong> kanssa päättyi eilen, eikä asiakkaalla ole enää voimassa olevia sopimuksia.<br>Harkitse, tarvitaanko uusi sopimus.`,
      btn: "Avaa Pactiva",
      footer: "Voit poistaa nämä ilmoitukset käytöstä Asetukset → Ilmoitukset.",
    },
    de: {
      subject: (customer: string) => `Kunde ohne aktiven Vertrag — ${customer}`,
      body: (title: string, customer: string) => `Der Vertrag <strong>${title}</strong> mit <strong>${customer}</strong> ist gestern abgelaufen, und der Kunde hat nun keine aktiven Verträge mehr.<br>Überlegen Sie, ob ein neuer Vertrag erstellt werden muss.`,
      btn: "Pactiva öffnen",
      footer: "Sie können diese Benachrichtigungen unter Einstellungen → Benachrichtigungen deaktivieren.",
    },
    fr: {
      subject: (customer: string) => `Client sans contrat actif — ${customer}`,
      body: (title: string, customer: string) => `Le contrat <strong>${title}</strong> avec <strong>${customer}</strong> a expiré hier, et le client n'a maintenant plus de contrats actifs.<br>Envisagez de créer un nouveau contrat.`,
      btn: "Ouvrir Pactiva",
      footer: "Vous pouvez désactiver ces notifications dans Paramètres → Notifications.",
    },
    es: {
      subject: (customer: string) => `Cliente sin contrato activo — ${customer}`,
      body: (title: string, customer: string) => `El contrato <strong>${title}</strong> con <strong>${customer}</strong> expiró ayer, y el cliente ya no tiene contratos activos.<br>Considera si se necesita crear un nuevo contrato.`,
      btn: "Abrir Pactiva",
      footer: "Puedes desactivar estas notificaciones en Configuración → Notificaciones.",
    },
    pt: {
      subject: (customer: string) => `Cliente sem contrato ativo — ${customer}`,
      body: (title: string, customer: string) => `O contrato <strong>${title}</strong> com <strong>${customer}</strong> expirou ontem, e o cliente não tem agora contratos ativos.<br>Considere se é necessário criar um novo contrato.`,
      btn: "Abrir Pactiva",
      footer: "Pode desativar estas notificações em Definições → Notificações.",
    },
  },
  signing: {
    no: {
      subject: (title: string) => `${title} — klar til signering`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> har sendt deg avtalen <strong>${title}</strong> til digital signering.`,
      cta: "Klikk på knappen nedenfor for å åpne og signere avtalen:",
      btn: "Signer avtalen",
      copy: "Eller kopier denne lenken direkte i nettleseren:",
      footer: "Denne signeringslenken er sendt via Pactiva.",
    },
    en: {
      subject: (title: string) => `${title} — ready for signing`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> has sent you the agreement <strong>${title}</strong> for digital signing.`,
      cta: "Click the button below to open and sign the agreement:",
      btn: "Sign the agreement",
      copy: "Or copy this link directly into your browser:",
      footer: "This signing link was sent via Pactiva.",
    },
    sv: {
      subject: (title: string) => `${title} — redo för signering`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> har skickat dig avtalet <strong>${title}</strong> för digital signering.`,
      cta: "Klicka på knappen nedan för att öppna och signera avtalet:",
      btn: "Signera avtalet",
      copy: "Eller kopiera denna länk direkt i din webbläsare:",
      footer: "Denna signeringslänk skickades via Pactiva.",
    },
    da: {
      subject: (title: string) => `${title} — klar til underskrift`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> har sendt dig aftalen <strong>${title}</strong> til digital underskrift.`,
      cta: "Klik på knappen nedenfor for at åbne og underskrive aftalen:",
      btn: "Underskriv aftalen",
      copy: "Eller kopiér dette link direkte i din browser:",
      footer: "Dette underskriftslink er sendt via Pactiva.",
    },
    fi: {
      subject: (title: string) => `${title} — valmis allekirjoitettavaksi`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> on lähettänyt sinulle sopimuksen <strong>${title}</strong> digitaalista allekirjoitusta varten.`,
      cta: "Napsauta alla olevaa painiketta avataksesi ja allekirjoittaaksesi sopimuksen:",
      btn: "Allekirjoita sopimus",
      copy: "Tai kopioi tämä linkki suoraan selaimeesi:",
      footer: "Tämä allekirjoituslinkki on lähetetty Pacti­van kautta.",
    },
    de: {
      subject: (title: string) => `${title} — bereit zur Unterzeichnung`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> hat Ihnen den Vertrag <strong>${title}</strong> zur digitalen Unterzeichnung geschickt.`,
      cta: "Klicken Sie auf die Schaltfläche unten, um den Vertrag zu öffnen und zu unterzeichnen:",
      btn: "Vertrag unterzeichnen",
      copy: "Oder kopieren Sie diesen Link direkt in Ihren Browser:",
      footer: "Dieser Unterzeichnungslink wurde über Pactiva gesendet.",
    },
    fr: {
      subject: (title: string) => `${title} — prêt pour la signature`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> vous a envoyé le contrat <strong>${title}</strong> pour signature numérique.`,
      cta: "Cliquez sur le bouton ci-dessous pour ouvrir et signer le contrat :",
      btn: "Signer le contrat",
      copy: "Ou copiez ce lien directement dans votre navigateur :",
      footer: "Ce lien de signature a été envoyé via Pactiva.",
    },
    es: {
      subject: (title: string) => `${title} — listo para firmar`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> te ha enviado el contrato <strong>${title}</strong> para firma digital.`,
      cta: "Haz clic en el botón de abajo para abrir y firmar el contrato:",
      btn: "Firmar el contrato",
      copy: "O copia este enlace directamente en tu navegador:",
      footer: "Este enlace de firma fue enviado a través de Pactiva.",
    },
    pt: {
      subject: (title: string) => `${title} — pronto para assinar`,
      sent: (sender: string, title: string) => `<strong>${sender}</strong> enviou-lhe o contrato <strong>${title}</strong> para assinatura digital.`,
      cta: "Clique no botão abaixo para abrir e assinar o contrato:",
      btn: "Assinar o contrato",
      copy: "Ou copie este link diretamente no seu navegador:",
      footer: "Este link de assinatura foi enviado via Pactiva.",
    },
  },
} as const

// ── E-postfunksjoner ──────────────────────────────────────────────────────────

export async function sendTrialEndingEmail(to: string, name: string, daysLeft: number, locale = "no") {
  if (!resend) return
  const l = t(locale)
  const tr = translations.trial[l]
  const timeLeft = tr.timeLeft(daysLeft)
  await resend.emails.send({
    from: FROM,
    to,
    subject: tr.subject(timeLeft),
    html: `
      <p>${translations.greeting[l](name)}</p>
      ${tr.body(name, timeLeft)}
      <p><a href="${APP_URL}/settings" style="${btnStyle("#2563eb")}">${tr.btn}</a></p>
      <p style="${footerStyle}">${tr.footer}</p>
    `,
  })
}

export async function sendPaymentFailedEmail(to: string, name: string, locale = "no") {
  if (!resend) return
  const l = t(locale)
  const tr = translations.payment[l]
  await resend.emails.send({
    from: FROM,
    to,
    subject: tr.subject,
    html: `
      <p>${translations.greeting[l](name)}</p>
      <p>${tr.body}</p>
      <p><a href="${APP_URL}/settings" style="${btnStyle("#dc2626")}">${tr.btn}</a></p>
      <p style="${footerStyle}">${tr.footer}</p>
    `,
  })
}

export async function sendExpiringAgreementEmail(
  to: string,
  name: string,
  customerName: string,
  agreementTitle: string,
  daysLeft: number,
  locale = "no"
) {
  if (!resend) return
  const l = t(locale)
  const tr = translations.expiring[l]
  const daysText = tr.daysText(daysLeft)
  await resend.emails.send({
    from: FROM,
    to,
    subject: tr.subject(daysText, customerName),
    html: `
      <p>${translations.greeting[l](name)}</p>
      <p>${tr.body(agreementTitle, customerName, daysText)}</p>
      <p><a href="${APP_URL}/customers" style="${btnStyle("#1e293b")}">${tr.btn}</a></p>
      <p style="${footerStyle}">${tr.footer}</p>
    `,
  })
}

export async function sendAgreementExpiredEmail(
  to: string,
  name: string,
  customerName: string,
  agreementTitle: string,
  locale = "no"
) {
  if (!resend) return
  const l = t(locale)
  const tr = translations.expired[l]
  await resend.emails.send({
    from: FROM,
    to,
    subject: tr.subject(customerName),
    html: `
      <p>${translations.greeting[l](name)}</p>
      <p>${tr.body(agreementTitle, customerName)}</p>
      <p><a href="${APP_URL}/customers" style="${btnStyle("#1e293b")}">${tr.btn}</a></p>
      <p style="${footerStyle}">${tr.footer}</p>
    `,
  })
}

export async function sendSigningLinkEmail(
  to: string,
  signerName: string,
  agreementTitle: string,
  signatureUrl: string,
  senderAccountName: string,
  locale = "no"
) {
  if (!resend) return
  const l = t(locale)
  const tr = translations.signing[l]
  await resend.emails.send({
    from: FROM,
    to,
    subject: tr.subject(agreementTitle),
    html: `
      <p>${translations.greeting[l](signerName)}</p>
      <p>${tr.sent(senderAccountName, agreementTitle)}</p>
      <p>${tr.cta}</p>
      <p><a href="${signatureUrl}" style="${btnStyle("#1e293b")}">${tr.btn}</a></p>
      <p>${tr.copy}<br>
      <span style="color:#4b5563;font-size:13px">${signatureUrl}</span></p>
      <p style="${footerStyle}">${tr.footer}</p>
    `,
  })
}

export async function sendAutoTopupSuccessEmail(to: string, name: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: "20 signeringskreditter er lagt til kontoen din",
    html: `
      <p>${translations.greeting["no"](name)}</p>
      <p>Auto-topup er gjennomført. <strong>20 signeringskreditter</strong> er belastet og lagt til kontoen din.</p>
      <p><a href="${APP_URL}/settings" style="${btnStyle("#1e293b")}">Se saldo</a></p>
      <p style="${footerStyle}">Du kan endre innstillinger for signeringspakker under Innstillinger → Abonnement.</p>
    `,
  })
}

export async function sendAutoTopupFailedEmail(to: string, name: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Auto-topup av signeringskreditter feilet",
    html: `
      <p>${translations.greeting["no"](name)}</p>
      <p>Vi klarte ikke å gjennomføre automatisk kjøp av signeringskreditter. Kontoen din har nå lav saldo.</p>
      <p>Logg inn og kjøp en ny pakke for å fortsette å bruke digital signering.</p>
      <p><a href="${APP_URL}/settings" style="${btnStyle("#dc2626")}">Kjøp signeringskreditter</a></p>
      <p style="${footerStyle}">Gå til Innstillinger → Abonnement for å administrere signeringskreditter.</p>
    `,
  })
}

const btnStyle = (bg: string) =>
  `background:${bg};color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px`

const footerStyle =
  "margin-top:24px;color:#6b7280;font-size:14px"
