import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rotas protegidas e seus roles requeridos
const protectedRoutes: Record<string, string[]> = {
  "/dashboard": ["ADMIN", "USER_PADRAO"],
  "/admin": ["ADMIN"],
  "/invoices": ["ADMIN", "USER_PADRAO"],
  "/payments": ["ADMIN", "USER_PADRAO"],
  "/clients": ["ADMIN", "USER_PADRAO"],
  "/reports": ["ADMIN", "USER_PADRAO"],
  "/service-providers": ["ADMIN"],
  "/services": ["ADMIN"],
  "/bank-accounts": ["ADMIN"],
  "/offices": ["ADMIN"],
  "/audit-logs": ["ADMIN"],
  "/settings": ["ADMIN"],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar se rota é protegida
  const isProtected = Object.keys(protectedRoutes).some((route) =>
    pathname.startsWith(route)
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // Verificar autenticação
  const session = await auth()

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // Verificar permissões
  const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
    pathname.startsWith(route)
  )?.[1]

  if (requiredRoles) {
    const userRole = session.user?.role

    if (!requiredRoles.includes(userRole || "")) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/invoices/:path*",
    "/payments/:path*",
    "/clients/:path*",
    "/reports/:path*",
    "/service-providers/:path*",
    "/services/:path*",
    "/bank-accounts/:path*",
    "/offices/:path*",
    "/audit-logs/:path*",
    "/settings/:path*",
  ],
}
