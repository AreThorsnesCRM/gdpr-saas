"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();

  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Opprett bruker i Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Opprett profil i "profiles"
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: data.user.id,
          full_name: name,
          company_name: company,
        });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        setError("Kunne ikke opprette profil. Prøv igjen.");
        setLoading(false);
        return;
      }
    }

    // 3. Send bruker videre til "check email"
    router.push("/check-email");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow"
      >
        <h1 className="text-2xl font-semibold">Opprett konto</h1>

        <div>
          <label className="block text-sm font-medium">Firmanavn</label>
          <input
            type="text"
            className="mt-1 w-full rounded border px-3 py-2"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Navn</label>
          <input
            type="text"
            className="mt-1 w-full rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">E‑post</label>
          <input
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Passord</label>
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
        >
          {loading ? "Oppretter..." : "Opprett konto"}
        </button>

        <p className="text-sm text-gray-600 text-center pt-2">
          Har du allerede konto?{" "}
          <a
            href="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            Logg inn
          </a>
        </p>
      </form>
    </div>
  );
}
