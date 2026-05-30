"use client"

import { useSearchParams } from "next/navigation"
import SubscribeButton from "../../components/SubscribeButton"
import { Suspense } from "react"

function UpgradeContent() {
  const params = useSearchParams()
  const reason = params.get("reason")

  const content = {
    trial: {
      title: "Prøveperioden er over",
      desc: "Prøveperioden din har utløpt. Start et abonnement for å fortsette å bruke Pactiva.",
    },
    canceled: {
      title: "Abonnementet er avsluttet",
      desc: "Abonnementet ditt er kansellert. Start et nytt abonnement for å få tilgang igjen.",
    },
    incomplete: {
      title: "Betaling ikke fullført",
      desc: "Betalingen for abonnementet ditt ble ikke fullført. Prøv igjen for å aktivere tilgangen.",
    },
  }[reason ?? "trial"] ?? {
    title: "Aktiver abonnement",
    desc: "For å få full tilgang til tjenesten må du aktivere abonnementet ditt.",
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{content.title}</h1>
        <p className="text-gray-500 mb-8">{content.desc}</p>
        <SubscribeButton label="Start abonnement" mode="checkout" />
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  )
}
