import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcryptjs from "bcryptjs"
import type { NextAuthConfig } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role: "ADMIN" | "USER_PADRAO"
      officeId: number
    }
  }

  interface JWT {
    id: string
    role: "ADMIN" | "USER_PADRAO"
    officeId: number
  }

  interface User {
    role?: "ADMIN" | "USER_PADRAO"
    officeId?: number
  }
}

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          throw new Error("Usuário não encontrado")
        }

        const passwordMatch = await bcryptjs.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) {
          throw new Error("Senha incorreta")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          officeId: user.officeId,
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    updateAge: 24 * 60 * 60, // 24 horas
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.officeId = (user as any).officeId
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as "ADMIN" | "USER_PADRAO"
        session.user.officeId = token.officeId as number
      }
      return session
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  events: {
    async signIn({ user }) {
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (dbUser) {
          // Log login
          const ipAddress = "127.0.0.1" // TODO: Extract from headers
          await prisma.auditLog.create({
            data: {
              officeId: dbUser.officeId,
              userId: dbUser.id,
              action: "login",
              description: `User ${user.email} logged in`,
              ipAddress,
            },
          })
        }
      }
    },

    async signOut({ token }) {
      if (token?.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
        })

        if (user) {
          // Log logout
          await prisma.auditLog.create({
            data: {
              officeId: user.officeId,
              userId: user.id,
              action: "logout",
              description: `User ${user.email} logged out`,
            },
          })
        }
      }
    },
  },

  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
