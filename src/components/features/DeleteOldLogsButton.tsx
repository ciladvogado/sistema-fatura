"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Alert } from "@/components/ui/Alert"
import { deleteOldAuditLogs } from "@/actions/audit"
import { Trash2 } from "lucide-react"

export function DeleteOldLogsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleDelete() {
    if (!date) {
      setError("Selecione uma data")
      return
    }
    const cutoff = new Date(date)
    const ok = window.confirm(
      `Confirmar exclusão de TODOS os logs anteriores a ${cutoff.toLocaleDateString("pt-BR")}? Esta ação é irreversível.`,
    )
    if (!ok) return

    setLoading(true)
    setError(null)
    const result = await deleteOldAuditLogs(cutoff)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }
    setMessage(`${result.data.count} log(s) excluído(s).`)
    setOpen(false)
    setDate("")
    router.refresh()
  }

  return (
    <>
      {!open && (
        <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Limpar logs antigos
        </Button>
      )}

      {open && (
        <div className="flex flex-wrap items-end gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex-1 min-w-48">
            <Input
              type="date"
              label="Excluir logs anteriores a"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
            {loading ? "Excluindo..." : "Confirmar exclusão"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false)
              setDate("")
              setError(null)
            }}
          >
            Cancelar
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {message && (
        <div className="mt-2">
          <Alert variant="success">{message}</Alert>
        </div>
      )}
    </>
  )
}
