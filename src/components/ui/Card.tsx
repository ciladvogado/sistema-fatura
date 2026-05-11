import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("px-6 py-4 border-b border-gray-200", className)}>{children}</div>
  )
}

export function CardTitle({ children, className }: CardProps) {
  return <h2 className={cn("text-lg font-semibold text-gray-900", className)}>{children}</h2>
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn("p-6", className)}>{children}</div>
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <div
      className={cn("px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg", className)}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface BadgeProps {
  children: ReactNode
  variant?: "default" | "success" | "danger" | "warning" | "info"
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const colors = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-blue-100 text-blue-700",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        colors[variant],
      )}
    >
      {children}
    </span>
  )
}
