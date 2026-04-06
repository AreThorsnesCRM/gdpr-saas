"use server"

import { redirect } from "next/navigation"

export async function logout() {
  await fetch("http://localhost:3000/api/logout", {
    method: "POST",
    credentials: "include",
  })

  redirect("/login")
}
