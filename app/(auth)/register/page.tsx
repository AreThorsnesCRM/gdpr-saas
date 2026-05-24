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

    if (!supabase) {
      setError("Tjeneste ikke tilgjengelig");
      setLoading(false);
      return;
    }

    // 1. Opprett bruker i Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          company_name: company,
        },
        emailRedirectTo: `${window.location.origin}/callback?full_name=${encodeURIComponent(name)}&company_name=${encodeURIComponent(company)}`,
      },
    });

    console.log("[register] SignUp request data:", { email, full_name: name, company_name: company });
    console.log("[register] SignUp response:", data, "Error:", signUpError);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setError("Kunne ikke opprette bruker.");
      setLoading(false);
      return;
    }

    // Profil og Stripe customer opprettes i callback etter e-post verifisering

    // 4. Send bruker videre til "check email"
    router.push("/check-email");
  }

  return (
    <div className="min-h-screen flex">

      {/* Venstre — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <img src="/pactiva-logo-light.svg" alt="Pactiva" className="h-16" />
        <div className="space-y-4">
          <h2 className="text-white text-3xl font-bold leading-snug">
            Profesjonell avtaleforvaltning<br />for moderne bedrifter
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Kom i gang med 14 dagers gratis prøveperiode. Ingen kredittkort nødvendig.
          </p>
        </div>
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Pactiva</p>
      </div>

      {/* Høyre — skjema */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-sm">

          <img src="/pactiva-logo-dark.svg" alt="Pactiva" className="lg:hidden h-10 mb-8" />

          <h1 className="text-2xl font-bold text-gray-900">Opprett konto</h1>
          <p className="text-gray-500 text-sm mt-1 mb-8">Start din 14-dagers gratis prøveperiode</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Firmanavn</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Navn</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-post</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Passord</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Oppretter..." : "Opprett konto"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            <span className="text-gray-500">Har du allerede konto? </span>
            <a href="/login" className="text-gray-700 font-medium hover:text-gray-900 transition-colors">
              Logg inn
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
