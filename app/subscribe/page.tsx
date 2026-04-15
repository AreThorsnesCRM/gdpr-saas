"use client"

export default function SubscribePage() {
  const handleSubscribe = async () => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
    })

    const data = await res.json()

    if (!data?.url) {
      console.error("No checkout URL returned")
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
