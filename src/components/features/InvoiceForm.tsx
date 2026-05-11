"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input, Select, Textarea } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { Card, CardBody, CardFooter } from "@/components/ui/Card"
import { createInvoice, updateInvoice } from "@/actions/invoices"
import { calculateInvoiceTotals } from "@/schemas/invoice"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"
import type { Invoice, InvoiceItem, Client, ServiceProvider, Service } from "@prisma/client"

const INVOICE_STATUS = [
  { value: "draft", label: "Rascunho" },
  { value: "issued", label: "Emitida" },
  { value: "sent", label: "Enviada" },
  { value: "partially_paid", label: "Parcialmente paga" },
  { value: "paid", label: "Paga" },
  { value: "overdue", label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
]

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
]

type ItemRow = {
  id?: number
  serviceId: number | null
  description: string
  itemCode: string
  quantity: number
  unitPrice: number
  taxPercent: number
}

interface Props {
  invoice?: Invoice & { items: InvoiceItem[] }
  clients: Client[]
  providers: (ServiceProvider & { services: Service[] })[]
}

export function InvoiceForm({ invoice, clients, providers }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const today = new Date().toISOString().split("T")[0]
  const currentYear = new Date().getFullYear()

  const [providerId, setProviderId] = useState<number | "">(
    invoice?.serviceProviderId ?? "",
  )
  const [discountAmount, setDiscountAmount] = useState<number>(
    Number(invoice?.discountAmount ?? 0),
  )
  const [discountPercent, setDiscountPercent] = useState<number>(
    Number(invoice?.discountPercent ?? 0),
  )
  const [taxAmount, setTaxAmount] = useState<number>(Number(invoice?.taxAmount ?? 0))

  const [items, setItems] = useState<ItemRow[]>(
    invoice?.items.length
      ? invoice.items
          .sort((a, b) => a.lineOrder - b.lineOrder)
          .map((i) => ({
            id: i.id,
            serviceId: i.serviceId,
            description: i.description,
            itemCode: i.itemCode ?? "",
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            taxPercent: Number(i.taxPercent),
          }))
      : [
          {
            serviceId: null,
            description: "",
            itemCode: "",
            quantity: 1,
            unitPrice: 0,
            taxPercent: 0,
          },
        ],
  )

  const selectedProvider = providers.find((p) => p.id === providerId)
  const availableServices = selectedProvider?.services ?? []

  const totals = useMemo(
    () =>
      calculateInvoiceTotals({
        items,
        discountAmount,
        discountPercent,
        taxAmount,
      }),
    [items, discountAmount, discountPercent, taxAmount],
  )

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        serviceId: null,
        description: "",
        itemCode: "",
        quantity: 1,
        unitPrice: 0,
        taxPercent: 0,
      },
    ])
  }

  function removeItem(idx: number) {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function onServiceChange(idx: number, serviceId: string) {
    const id = serviceId ? Number(serviceId) : null
    const svc = availableServices.find((s) => s.id === id)
    updateItem(idx, {
      serviceId: id,
      description: svc?.name ?? items[idx].description,
      unitPrice: svc ? Number(svc.basePrice) : items[idx].unitPrice,
      quantity: svc?.containsQuantity === false ? 1 : items[idx].quantity,
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    const fd = new FormData(event.currentTarget)

    const payload = {
      clientId: Number(fd.get("clientId")),
      serviceProviderId: Number(fd.get("serviceProviderId")),
      invoiceNumber: String(fd.get("invoiceNumber") || ""),
      referenceNumber: String(fd.get("referenceNumber") || "") || null,
      competencyMonth: Number(fd.get("competencyMonth")),
      competencyYear: Number(fd.get("competencyYear")),
      issueDate: new Date(String(fd.get("issueDate"))),
      dueDate: new Date(String(fd.get("dueDate"))),
      discountAmount,
      discountPercent,
      taxAmount,
      status: String(fd.get("status")) as any,
      notes: String(fd.get("notes") || "") || null,
      internalNotes: String(fd.get("internalNotes") || "") || null,
      items: items.map((it, i) => ({
        ...it,
        lineOrder: i + 1,
      })),
    }

    const result = invoice
      ? await updateInvoice(invoice.id, payload)
      : await createInvoice(payload)

    if (!result.success) {
      setError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setLoading(false)
      return
    }

    router.push("/invoices")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              name="clientId"
              label="Cliente"
              required
              placeholder="Selecione o cliente"
              defaultValue={invoice?.clientId ?? ""}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              error={fieldErrors.clientId?.[0]}
            />
            <Select
              name="serviceProviderId"
              label="Prestador"
              required
              placeholder="Selecione o prestador"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : "")}
              options={providers.map((p) => ({ value: p.id, label: p.name }))}
              error={fieldErrors.serviceProviderId?.[0]}
            />
            <Input
              name="invoiceNumber"
              label="Número da fatura"
              required
              defaultValue={invoice?.invoiceNumber ?? ""}
              error={fieldErrors.invoiceNumber?.[0]}
            />
            <Input
              name="referenceNumber"
              label="Número de referência (opcional)"
              defaultValue={invoice?.referenceNumber ?? ""}
            />
            <Select
              name="competencyMonth"
              label="Mês competência"
              required
              defaultValue={invoice?.competencyMonth ?? new Date().getMonth() + 1}
              options={MONTHS}
            />
            <Input
              name="competencyYear"
              type="number"
              label="Ano competência"
              required
              defaultValue={invoice?.competencyYear ?? currentYear}
            />
            <Input
              name="issueDate"
              type="date"
              label="Data de emissão"
              required
              defaultValue={
                invoice?.issueDate
                  ? new Date(invoice.issueDate).toISOString().split("T")[0]
                  : today
              }
            />
            <Input
              name="dueDate"
              type="date"
              label="Data de vencimento"
              required
              defaultValue={
                invoice?.dueDate
                  ? new Date(invoice.dueDate).toISOString().split("T")[0]
                  : today
              }
            />
            <Select
              name="status"
              label="Status"
              defaultValue={invoice?.status ?? "draft"}
              options={INVOICE_STATUS}
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Itens da fatura</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" />
                Adicionar item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-md border border-gray-200"
                >
                  <div className="col-span-12 md:col-span-3">
                    <Select
                      label={idx === 0 ? "Serviço" : undefined}
                      placeholder="Selecionar..."
                      value={item.serviceId ?? ""}
                      onChange={(e) => onServiceChange(idx, e.target.value)}
                      options={availableServices.map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <Input
                      label={idx === 0 ? "Descrição" : undefined}
                      required
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Input
                      label={idx === 0 ? "Qtd" : undefined}
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, { quantity: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      label={idx === 0 ? "Preço unit." : undefined}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(idx, { unitPrice: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <Input
                      label={idx === 0 ? "ISS %" : undefined}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.taxPercent}
                      onChange={(e) =>
                        updateItem(idx, { taxPercent: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-end">
                    {idx === 0 && <div className="invisible h-7" />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="col-span-12 text-right text-xs text-gray-600 -mt-2">
                    Subtotal:{" "}
                    <span className="font-semibold">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Descontos e impostos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Desconto (R$)"
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              />
              <Input
                label="Desconto (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
              />
              <Input
                label="Imposto adicional (R$)"
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-700 font-medium">Subtotal</p>
              <p className="text-blue-900 font-bold text-lg">
                {formatCurrency(totals.subtotal)}
              </p>
            </div>
            <div>
              <p className="text-blue-700 font-medium">Desconto</p>
              <p className="text-blue-900 font-bold text-lg">
                {formatCurrency(totals.discountAmount)}
              </p>
            </div>
            <div>
              <p className="text-blue-700 font-medium">Impostos</p>
              <p className="text-blue-900 font-bold text-lg">
                {formatCurrency(totals.taxAmount)}
              </p>
            </div>
            <div>
              <p className="text-blue-700 font-medium">Total</p>
              <p className="text-blue-900 font-bold text-xl">
                {formatCurrency(totals.totalAmount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <Textarea
              name="notes"
              label="Observações (visíveis ao cliente)"
              defaultValue={invoice?.notes ?? ""}
              rows={3}
            />
            <Textarea
              name="internalNotes"
              label="Notas internas"
              defaultValue={invoice?.internalNotes ?? ""}
              rows={3}
            />
          </div>
        </CardBody>
        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/invoices")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : invoice ? "Atualizar fatura" : "Criar fatura"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
