"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

const DEMO_USERS = [
  {
    email: "admin@escritorio.com.br",
    password: "admin123456",
    name: "Administrador",
    role: "ADMIN",
  },
  {
    email: "usuario@escritorio.com.br",
    password: "user123456",
    name: "Usuário Padrão",
    role: "USER_PADRAO",
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const handleQuickLogin = async (user: (typeof DEMO_USERS)[0]) => {
    setLoading(true)
    setError("")
    setSelectedUser(user.email)

    const result = await signIn("credentials", {
      email: user.email,
      password: user.password,
      redirect: false,
    })

    if (result?.ok) {
      router.push("/dashboard")
    } else {
      setError(result?.error || "Falha no login")
      setSelectedUser(null)
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.ok) {
      router.push("/dashboard")
    } else {
      setError(result?.error || "Email ou senha inválidos")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Faturas</h1>
          <p className="text-gray-600 mt-2">Controle de Terceirização</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Usuários de Demonstração */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Usuários Disponíveis
          </h2>
          <div className="space-y-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                onClick={() => handleQuickLogin(user)}
                disabled={loading}
                className={`w-full p-4 rounded-lg transition border-2 text-left ${
                  selectedUser === user.email
                    ? "bg-blue-200 border-blue-500 shadow-md"
                    : "bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-500 hover:shadow"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-semibold text-blue-900">{user.name}</div>
                <div className="text-sm text-blue-700 mt-1">{user.email}</div>
                <div className="text-xs font-mono text-white mt-2 bg-blue-600 px-2 py-1 rounded w-fit">
                  {user.role}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>

        {/* Formulário Manual */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-blue-600 hover:underline">
            Esqueceu a senha?
          </a>
        </div>
      </div>
    </div>
  )
}
