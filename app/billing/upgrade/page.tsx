"use client"

import SubscribeButton from "@/components/SubscribeButton"

export default function UpgradePage() {
  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Aktiver abonnement</h1>

      <p className="text-gray-600 mb-6">
        For å få full tilgang til tjenesten må du aktivere abonnementet ditt.
      </p>

      <SubscribeButton label="Start abonnement" mode="checkout" />
    </div>
  )
}
