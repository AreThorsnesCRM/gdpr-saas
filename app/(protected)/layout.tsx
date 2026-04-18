"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import Sidebar from "./_components/sidebar"
import Header from "./_components/Header"
import AuthGuard from "./_components/AuthGuard"
import React from "react"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 min-h-screen flex">
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        <Header />
        <AuthGuard />
        {children}
      </main>
    </div>
  )
}
