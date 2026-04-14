"use client"

import SubscribeButton from "@/components/SubscribeButton"

export default function PaymentRequiredPage() {
  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Betaling kreves</h1>

      <p className="text-gray-600 mb-6">
        Betalingen for abonnementet ditt feilet. Oppdater betalingsmetoden for å fortsette å bruke tjenesten.
      </p>

      <SubscribeButton label="Oppdater betalingsmetode" mode="portal" />
    </div>
  )
}
