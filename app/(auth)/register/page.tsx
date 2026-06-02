"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Script from "next/script";
import { supabase } from "@/lib/supabaseClient";

function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < 8) return 0;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score === 3) return 3;
  if (score === 2) return 2;
  return 1;
}

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("register");

  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    (window as any).__turnstileCallback = (token: string) => setTurnstileToken(token);
    (window as any).__turnstileExpired = () => setTurnstileToken("");
    return () => {
      delete (window as any).__turnstileCallback;
      delete (window as any).__turnstileExpired;
    };
  }, []);

  const strength = getPasswordStrength(password);
  const strengthLabel = strength === 3 ? t("strengthStrong") : strength === 2 ? t("strengthMedium") : strength === 1 ? t("strengthWeak") : "";
  const strengthColor = strength === 3 ? "bg-green-500" : strength === 2 ? "bg-yellow-400" : "bg-red-400";

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("errorTooShort"));
      return;
    }
    if (strength < 2) {
      setError(t("errorTooWeak"));
      return;
    }
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !turnstileToken) {
      setError(t("errorCaptcha"));
      return;
    }

    setLoading(true);

    if (siteKey && turnstileToken) {
      const captchaRes = await fetch("/api/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });
      if (!captchaRes.ok) {
        setError(t("errorCaptchaFailed"));
        setLoading(false);
        return;
      }
    }

    if (!supabase) {
      setError("Tjeneste ikke tilgjengelig");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, company_name: company },
        emailRedirectTo: `${window.location.origin}/callback?full_name=${encodeURIComponent(name)}&company_name=${encodeURIComponent(company)}`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Kunne ikke opprette bruker.");
      setLoading(false);
      return;
    }

    router.push("/check-email");
  }

  return (
    <>
    {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
    )}
    <div className="min-h-screen flex">

      {/* Venstre — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <img src="/pactiva-logo-light.svg" alt="Pactiva" className="h-16" />
        <div className="space-y-4">
          <h2 className="text-white text-3xl font-bold leading-snug whitespace-pre-line">
            {t("brandingHeadline")}
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            {t("brandingSubheadline")}
          </p>
        </div>
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Pactiva</p>
      </div>

      {/* Høyre — skjema */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-sm">

          <img src="/pactiva-logo-dark.svg" alt="Pactiva" className="lg:hidden h-10 mb-8" />

          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 text-sm mt-1 mb-8">{t("subtitle")}</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("companyLabel")}</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("nameLabel")}</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("emailLabel")}</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("passwordLabel")}</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${strength >= level ? strengthColor : "bg-gray-200"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {strengthLabel && <span className="font-medium">{strengthLabel} — </span>}
                    {t("passwordHint")}
                  </p>
                </div>
              )}
            </div>

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                data-callback="__turnstileCallback"
                data-expired-callback="__turnstileExpired"
              />
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? t("creating") : t("createButton")}
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            <span className="text-gray-500">{t("hasAccount")} </span>
            <Link href="/login" className="text-gray-700 font-medium hover:text-gray-900 transition-colors">
              {t("loginLink")}
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            {t("cookieNotice")}{" "}
            <Link href="/privacy" className="underline hover:text-gray-600 transition-colors">
              {t("cookiePrivacyLink")}
            </Link>
          </p>

        </div>
      </div>
    </div>
    </>
  );
}
