"use client";

import { useState } from "react";

export default function SubscribeButton({
  label = "Abonner nå",
  mode = "checkout",
}: {
  label?: string;
  mode?: "checkout" | "portal";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    const endpoint = mode === "checkout" ? "/api/create-checkout-session" : "/api/create-portal-session";
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Noe gikk galt. Prøv igjen.");
        setLoading(false);
      }
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition disabled:opacity-60"
      >
        {loading ? "Laster..." : label}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
