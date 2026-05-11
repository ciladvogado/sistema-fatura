"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardBody, CardFooter } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Select, Checkbox } from "@/components/ui/Input"
import { Alert } from "@/components/ui/Alert"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table"
import { bulkCreateInvoices } from "@/actions/bulk-invoice-creation"
import { formatCurrency } from "@/lib/utils"
import type { Client, ServiceProvider, Service } from "@prisma/client"

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

type Row = {
  clientId: number
  clientName: string
  serviceId: number
  serviceName: string
  containsQuantity: boolean
  quantity: number
  unitPrice: number
  selected: boolean
}

interface Props {
  clients: Client[]
  providers: (ServiceProvider & { services: Service[] })[]
}

export function InvoiceWizard({ clients, providers }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const today = new Date()
  const [providerId, setProviderId] = useState<number | "">("")
  const [serviceId, setServiceId] = useState<number | "">("")
  const [competencyMonth, setCompetencyMonth] = useState<number>(today.getMonth() + 1)
  const [competencyYear, setCompetencyYear] = useState<number>(today.getFullYear())
  const [issueDate, setIssueDate] = useState<string>(today.toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  )
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set())
  const [rows, setRows] = useState<Row[]>([])

  const provider = providers.find((p) => p.id === providerId)
  const services = provider?.services ?? []
  const service = services.find((s) => s.id === serviceId)

  function toggleClient(id: number) {
    const next = new Set(selectedClientIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedClientIds(next)
  }

  function selectAllClients() {
    setSelectedClientIds(new Set(clients.map((c) => c.id)))
  }

  function clearClients() {
    setSelectedClientIds(new Set())
  }

  function buildRows() {
    if (!service || selectedClientIds.size === 0) return
    const list: Row[] = Array.from(selectedClientIds)
      .map((cid) => {
        const c = clients.find((x) => x.id === cid)!
        return {
          clientId: c.id,
          clientName: c.name,
          serviceId: service.id,
          serviceName: service.name,
          containsQuantity: service.containsQuantity,
          quantity: service.containsQuantity ? 0 : 1,
          unitPrice: Number(service.basePrice),
          selected: true,
        }
      })
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
    setRows(list)
    setStep(3)
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const totalsByRow = useMemo(
    () => rows.map((r) => r.quantity * r.unitPrice),
    [rows],
  )
  const grandTotal = totalsByRow.reduce((acc, t) => acc + t, 0)
  const validRows = rows.filter((r) => r.selected && r.quantity > 0)

  async function handleSubmit() {
    if (!providerId || !serviceId) {
      setError("Selecione prestador e serviço")
      return
    }
    if (validRows.length === 0) {
      setError("Nenhuma linha com quantidade > 0 e selecionada")
      return
    }

    setLoading(true)
    setError(null)

    const result = await bulkCreateInvoices({
      serviceProviderId: Number(providerId),
      competencyMonth,
      competencyYear,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      items: validRows.map((r) => ({
        clientId: r.clientId,
        serviceId: r.serviceId,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
      })),
    })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push("/invoices")
    router.refresh()
  }

  return (
    <Card>
      <CardBody className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Stepper */}
        <div className="flex items-center gap-2 text-sm mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {s}
              </div>
              <span className={step >= s ? "text-gray-900" : "text-gray-500"}>
                {s === 1 && "Competência e prestador"}
                {s === 2 && "Serviço e clientes"}
                {s === 3 && "Quantidades e preços"}
              </span>
              {s < 3 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Configure a competência e o prestador
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Mês de competência"
                required
                value={competencyMonth}
                onChange={(e) => setCompetencyMonth(Number(e.target.value))}
                options={MONTHS}
              />
              <Input
                type="number"
                label="Ano"
                required
                value={competencyYear}
                onChange={(e) => setCompetencyYear(Number(e.target.value))}
              />
              <Input
                type="date"
                label="Data de emissão"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
              <Input
                type="date"
                label="Data de vencimento"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <div className="md:col-span-2">
                <Select
                  label="Prestador"
                  required
                  placeholder="Selecione..."
                  value={providerId}
                  onChange={(e) =>
                    setProviderId(e.target.value ? Number(e.target.value) : "")
                  }
                  options={providers.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Escolha o serviço e os clientes
            </h3>
            <Select
              label="Serviço a faturar"
              required
              placeholder="Selecione um serviço..."
              value={serviceId}
              onChange={(e) =>
                setServiceId(e.target.value ? Number(e.target.value) : "")
              }
              options={services.map((s) => ({
                value: s.id,
                label: `${s.name}${s.containsQuantity ? "" : " (qtd fixa = 1)"}`,
              }))}
              hint={
                service?.containsQuantity === false
                  ? "Este serviço não usa quantidade. Será criada uma fatura por cliente com qty=1."
                  : "Você definirá a quantidade na próxima etapa para cada cliente."
              }
            />

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Clientes ({selectedClientIds.size} selecionado(s) de {clients.length})
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAllClients}>
                  Selecionar todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearClients}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
              {clients.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedClientIds.has(c.id)}
                    onChange={() => toggleClient(c.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Revise as quantidades e preços antes de gerar as faturas
            </h3>
            {service?.containsQuantity ? (
              <Alert variant="warning">
                Linhas com quantidade = 0 serão ignoradas.
              </Alert>
            ) : (
              <Alert variant="info">
                Este serviço não usa quantidade. Será criada 1 fatura por cliente com quantidade fixa em 1.
              </Alert>
            )}

            <Table>
              <THead>
                <TR>
                  <TH>Incluir</TH>
                  <TH>Cliente</TH>
                  <TH>Serviço</TH>
                  <TH>Qtd</TH>
                  <TH>Preço unit.</TH>
                  <TH>Total</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row, idx) => (
                  <TR key={row.clientId}>
                    <TD>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => updateRow(idx, { selected: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </TD>
                    <TD className="font-medium">{row.clientName}</TD>
                    <TD>{row.serviceName}</TD>
                    <TD>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="50"
                        disabled={!row.containsQuantity}
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(idx, { quantity: Number(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                      />
                    </TD>
                    <TD>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateRow(idx, { unitPrice: Number(e.target.value) || 0 })
                        }
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </TD>
                    <TD className="font-semibold">
                      {formatCurrency(totalsByRow[idx])}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <div className="bg-blue-50 border border-blue-200 rounded p-4 flex items-center justify-between">
              <span className="text-blue-900">
                Faturas válidas: <strong>{validRows.length}</strong>
              </span>
              <span className="text-blue-900 text-xl font-bold">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        )}
      </CardBody>

      <CardFooter className="flex justify-between gap-3">
        <div>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
            >
              Voltar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/invoices")}
          >
            Cancelar
          </Button>
          {step === 1 && (
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!providerId || !competencyMonth || !competencyYear}
            >
              Próximo
            </Button>
          )}
          {step === 2 && (
            <Button
              type="button"
              onClick={buildRows}
              disabled={!serviceId || selectedClientIds.size === 0}
            >
              Gerar pré-visualização
            </Button>
          )}
          {step === 3 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || validRows.length === 0}
            >
              {loading ? "Gerando..." : `Criar ${validRows.length} fatura(s)`}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
