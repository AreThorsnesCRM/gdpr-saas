"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export default function CheckEmailPage() {
  const t = useTranslations("checkEmail");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-gray-100">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t("title")}</h1>
        <p className="text-gray-600 text-sm leading-relaxed">{t("body")}</p>
        <p className="mt-4 text-sm text-gray-400">{t("spam")}</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
