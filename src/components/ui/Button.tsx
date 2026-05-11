import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes } from "react"

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 focus:ring-blue-500",
  secondary:
    "bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-200 focus:ring-gray-400",
  danger:
    "bg-red-600 hover:bg-red-700 text-white border-red-600 focus:ring-red-500",
  ghost:
    "bg-transparent hover:bg-gray-100 text-gray-700 border-transparent focus:ring-gray-300",
  outline:
    "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 focus:ring-blue-500",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
