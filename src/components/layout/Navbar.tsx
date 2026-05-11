import { signOut } from "@/lib/auth"
import { Button } from "@/components/ui/Button"
import { LogOut, User as UserIcon } from "lucide-react"

interface NavbarProps {
  userName: string
  userEmail: string
  userRole: "ADMIN" | "USER_PADRAO"
}

export function Navbar({ userName, userEmail, userRole }: NavbarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>
            <p className="text-xs text-gray-500">
              {userEmail} ·{" "}
              <span className="font-mono">
                {userRole === "ADMIN" ? "Administrador" : "Usuário Padrão"}
              </span>
            </p>
          </div>
        </div>

        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/auth/login" })
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  )
}
