import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className={cn("min-w-full divide-y divide-gray-200", className)}>
        {children}
      </table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-gray-50">{children}</thead>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("hover:bg-gray-50 transition", className)}>{children}</tr>
}

export function TH({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600",
        className,
      )}
    >
      {children}
    </th>
  )
}

export function TD({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3 text-sm text-gray-800 whitespace-nowrap", className)}>
      {children}
    </td>
  )
}

export function EmptyState({ message = "Nenhum registro encontrado" }: { message?: string }) {
  return (
    <div className="text-center py-12 text-gray-500 text-sm bg-white rounded-lg border border-gray-200">
      {message}
    </div>
  )
}
