"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import Sidebar from "./_components/sidebar"
import AuthGuard from "./_components/AuthGuard"
import React from "react"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64">
        <AuthGuard />
        {children}
      </main>
    </div>
  )
}
