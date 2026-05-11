import { requireAuth } from "@/lib/auth-utils"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  const user = session.user

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col">
        <Navbar
          userName={user.name ?? "Usuário"}
          userEmail={user.email ?? ""}
          userRole={user.role}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
