"use client";

export default function SubscribeButton({
  label = "Abonner nå",
  mode = "checkout", // "checkout" | "portal"
}: {
  label?: string;
  mode?: "checkout" | "portal";
}) {
  const handleClick = async () => {
    if (mode === "checkout") {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
      });

      const data = await res.json();
      window.location.href = data.url;
      return;
    }

    if (mode === "portal") {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
      });

      const data = await res.json();
      window.location.href = data.url;
      return;
    }
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
      {label}
    </button>
  );
}
