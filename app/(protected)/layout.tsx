"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import { useState } from "react"
import Sidebar from "./_components/sidebar"
import AuthGuard from "./_components/AuthGuard"
import OnboardingModal from "@/app/components/OnboardingModal"
import AssistantChat from "@/app/components/AssistantChat"
import React from "react"
import { Bars3Icon } from "@heroicons/react/24/outline"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-64 min-w-0">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-700 hover:text-gray-900"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <img src="/pactiva-logo-dark.svg" alt="Pactiva" className="h-8" />
        </div>

        <AuthGuard />
        <OnboardingModal />
        {children}
      </main>
      <AssistantChat />
    </div>
  )
}
