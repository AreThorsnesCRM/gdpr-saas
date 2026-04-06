"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function SubscribePage() {
  const router = useRouter()

  const handleSubscribe = async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout-session")

    if (error) {
      console.error(error)
      return
    }

    window.location.href = data.url
  }

  return (
    <div className="max-w-lg mx-auto mt-20 bg-white p-8 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Abonnement kreves</h1>
      <p className="mb-6 text-gray-700">
        Prøveperioden din er utløpt. For å fortsette å bruke tjenesten, må du aktivere et abonnement.
      </p>

      <button
        onClick={handleSubscribe}
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
      >
        Start abonnement
      </button>
    </div>
  )
}
