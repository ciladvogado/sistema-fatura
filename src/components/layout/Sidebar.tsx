"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Users,
  Briefcase,
  Wrench,
  Banknote,
  Building2,
  ScrollText,
  Settings,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Faturas", href: "/invoices", icon: FileText },
  { label: "Pagamentos", href: "/payments", icon: CreditCard },
  { label: "Relatórios", href: "/reports", icon: BarChart3 },
  { label: "Clientes", href: "/clients", icon: Users },
  { label: "Prestadores", href: "/service-providers", icon: Briefcase, adminOnly: true },
  { label: "Serviços", href: "/services", icon: Wrench, adminOnly: true },
  { label: "Contas Bancárias", href: "/bank-accounts", icon: Banknote, adminOnly: true },
  { label: "Escritórios", href: "/offices", icon: Building2, adminOnly: true },
  { label: "Auditoria", href: "/audit-logs", icon: ScrollText, adminOnly: true },
  { label: "Configurações", href: "/settings", icon: Settings, adminOnly: true },
]

interface SidebarProps {
  userRole: "ADMIN" | "USER_PADRAO"
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "ADMIN",
  )

  return (
    <aside className="w-64 bg-gray-900 text-gray-100 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">Sistema de Faturas</h1>
        <p className="text-xs text-gray-400 mt-0.5">Controle de Terceirização</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
