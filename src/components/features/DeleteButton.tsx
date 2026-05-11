"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { ActionResult } from "@/types"

interface DeleteButtonProps {
  id: number
  entityName: string
  action: (id: number) => Promise<ActionResult>
  confirmText?: string
}

export function DeleteButton({
  id,
  entityName,
  action,
  confirmText,
}: DeleteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    const ok = window.confirm(
      confirmText ?? `Tem certeza que deseja excluir "${entityName}"?`,
    )
    if (!ok) return

    setLoading(true)
    const result = await action(id)
    setLoading(false)

    if (!result.success) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
