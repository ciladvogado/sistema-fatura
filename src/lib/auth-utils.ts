import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  return session
}

export async function requireRole(roles: string[]) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  const userRole = session.user?.role

  if (!roles.includes(userRole || "")) {
    redirect("/unauthorized")
  }

  return session
}

export async function getServerSession() {
  return await auth()
}
