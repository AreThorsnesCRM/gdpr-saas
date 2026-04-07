"use server"

import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = formData.get("email")
  const password = formData.get("password")

  const res = await fetch("http://localhost:3000/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    credentials: "include",
  })

  if (!res.ok) {
    return { error: "Feil e‑post eller passord" }
  }

  redirect("/dashboard")
}
