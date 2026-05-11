import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react"
import type { ReactNode } from "react"

type AlertVariant = "info" | "success" | "warning" | "error"

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  className?: string
}

const variantStyles: Record<AlertVariant, { container: string; icon: ReactNode }> = {
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
  success: {
    container: "bg-green-50 border-green-200 text-green-800",
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  },
  warning: {
    container: "bg-yellow-50 border-yellow-200 text-yellow-800",
    icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
}

export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const styles = variantStyles[variant]
  return (
    <div className={cn("flex gap-3 p-4 border rounded-md", styles.container, className)}>
      <div className="shrink-0">{styles.icon}</div>
      <div className="flex-1">
        {title && <h4 className="font-semibold text-sm mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}
