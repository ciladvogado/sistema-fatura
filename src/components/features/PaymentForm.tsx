"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input, Select, Textarea } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { Card, CardBody, CardFooter } from "@/components/ui/Card"
import { createPayment, getOpenInvoicesForProvider } from "@/actions/payments"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { ServiceProvider, BankAccount } from "@prisma/client"

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "bank_transfer", label: "Transferência (TED/DOC)" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "check", label: "Cheque" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
]

const PAYMENT_STATUS = [
  { value: "completed", label: "Concluído" },
  { value: "pending", label: "Pendente" },
  { value: "processing", label: "Processando" },
]

type OpenInvoice = {
  id: number
  invoiceNumber: string
  dueDate: Date
  totalAmount: any
  remainingAmount: any
  client: { name: string }
}

interface Props {
  providers: ServiceProvider[]
  bankAccounts: BankAccount[]
  officeId: number
}

export function PaymentForm({ providers, bankAccounts }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const [providerId, setProviderId] = useState<number | "">("")
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([])
  const [allocations, setAllocations] = useState<Record<number, number>>({})
  const [amount, setAmount] = useState<number>(0)
  const today = new Date().toISOString().split("T")[0]

  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((acc, v) => acc + (v || 0), 0),
    [allocations],
  )

  const diff = amount - totalAllocated

  async function onProviderChange(value: string) {
    const id = value ? Number(value) : ""
    setProviderId(id)
    setAllocations({})
    if (!id) {
      setOpenInvoices([])
      return
    }
    startTransition(async () => {
      const list = await getOpenInvoicesForProvider(
        id,
        providers.find((p) => p.id === id)!.officeId,
      )
      setOpenInvoices(list as any)
    })
  }

  function setAllocation(invoiceId: number, val: number) {
    setAllocations((prev) => ({ ...prev, [invoiceId]: val }))
  }

  function autoDistribute() {
    let remaining = amount
    const updated: Record<number, number> = {}
    for (const inv of openInvoices) {
      const avail = Number(inv.remainingAmount)
      if (remaining <= 0) break
      const take = Math.min(remaining, avail)
      updated[inv.id] = Number(take.toFixed(2))
      remaining = Number((remaining - take).toFixed(2))
    }
    setAllocations(updated)
  }

  function fillFull(invoiceId: number) {
    const inv = openInvoices.find((i) => i.id === invoiceId)
    if (!inv) return
    setAllocation(invoiceId, Number(inv.remainingAmount))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    const fd = new FormData(event.currentTarget)

    const allocationsArr = Object.entries(allocations)
      .filter(([, v]) => Number(v) > 0)
      .map(([invoiceId, allocatedAmount]) => ({
        invoiceId: Number(invoiceId),
        allocatedAmount: Number(allocatedAmount),
      }))

    if (allocationsArr.length === 0) {
      setError("Aloque o pagamento a pelo menos uma fatura")
      setLoading(false)
      return
    }

    const result = await createPayment({
      serviceProviderId: Number(fd.get("serviceProviderId")),
      bankAccountId: fd.get("bankAccountId") ? Number(fd.get("bankAccountId")) : null,
      paymentReference: String(fd.get("paymentReference") || ""),
      externalTransactionId: String(fd.get("externalTransactionId") || "") || null,
      amount,
      paymentMethod: String(fd.get("paymentMethod")) as any,
      paymentStatus: String(fd.get("paymentStatus")) as any,
      paymentDate: new Date(String(fd.get("paymentDate"))),
      processedDate: fd.get("processedDate") ? new Date(String(fd.get("processedDate"))) : null,
      clearedDate: null,
      notes: String(fd.get("notes") || "") || null,
      receiptNumber: String(fd.get("receiptNumber") || "") || null,
      allocations: allocationsArr,
    })

    if (!result.success) {
      setError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setLoading(false)
      return
    }

    router.push("/payments")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              name="serviceProviderId"
              label="Prestador a pagar"
              required
              placeholder="Selecione o prestador"
              value={providerId}
              onChange={(e) => onProviderChange(e.target.value)}
              options={providers.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Select
              name="bankAccountId"
              label="Conta bancária (origem)"
              placeholder="Selecione..."
              options={bankAccounts.map((b) => ({
                value: b.id,
                label: `${b.bankCode} - ${b.bankName} (Ag. ${b.agencyNumber} / Cc. ${b.accountNumber})`,
              }))}
            />
            <Input
              name="paymentReference"
              label="Referência única"
              required
              placeholder="Ex: PIX-2025-001"
              hint="Identificador único do pagamento (TED/PIX/etc)"
            />
            <Input
              name="externalTransactionId"
              label="ID transação externa"
              hint="Comprovante/protocolo (opcional)"
            />
            <Input
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              label="Valor do pagamento"
              required
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
            <Select
              name="paymentMethod"
              label="Forma de pagamento"
              required
              defaultValue="pix"
              options={PAYMENT_METHODS}
            />
            <Input
              type="date"
              name="paymentDate"
              label="Data do pagamento"
              required
              defaultValue={today}
            />
            <Select
              name="paymentStatus"
              label="Status"
              defaultValue="completed"
              options={PAYMENT_STATUS}
            />
            <Input
              type="date"
              name="processedDate"
              label="Data de processamento"
            />
            <Input name="receiptNumber" label="Número do recibo" />
          </div>

          <Textarea name="notes" label="Observações" rows={2} />

          {providerId && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Alocação a faturas em aberto deste prestador
                </h3>
                {openInvoices.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={autoDistribute}
                    disabled={amount <= 0}
                  >
                    Distribuir automático
                  </Button>
                )}
              </div>

              {pending && (
                <p className="text-sm text-gray-500">Carregando faturas...</p>
              )}

              {!pending && openInvoices.length === 0 && (
                <Alert variant="info">
                  Não há faturas em aberto para este prestador.
                </Alert>
              )}

              {openInvoices.length > 0 && (
                <div className="space-y-2">
                  {openInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {inv.invoiceNumber} - {inv.client.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Vence em {formatDate(inv.dueDate)} · Saldo:{" "}
                          <span className="font-semibold text-red-700">
                            {formatCurrency(Number(inv.remainingAmount))}
                          </span>{" "}
                          / Total: {formatCurrency(Number(inv.totalAmount))}
                        </p>
                      </div>
                      <div className="w-40">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={Number(inv.remainingAmount)}
                          value={allocations[inv.id] ?? ""}
                          placeholder="0,00"
                          onChange={(e) =>
                            setAllocation(inv.id, Number(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fillFull(inv.id)}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))}

                  <div
                    className={`mt-4 p-3 rounded-md border text-sm ${
                      Math.abs(diff) < 0.01
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-yellow-50 border-yellow-200 text-yellow-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        Total alocado:{" "}
                        <strong>{formatCurrency(totalAllocated)}</strong> de{" "}
                        <strong>{formatCurrency(amount)}</strong>
                      </span>
                      <span>
                        {Math.abs(diff) < 0.01
                          ? "✓ Valor confere"
                          : diff > 0
                            ? `Faltam ${formatCurrency(diff)}`
                            : `Excede em ${formatCurrency(-diff)}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/payments")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || amount <= 0}>
            {loading ? "Registrando..." : "Registrar pagamento"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
