import Link from "next/link"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Badge } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { Plus, Pencil, Wand2 } from "lucide-react"
import { deleteInvoice, markOverdueInvoices } from "@/actions/invoices"
import { DeleteButton } from "@/components/features/DeleteButton"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { InvoiceStatus } from "@prisma/client"

const STATUS_INFO: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "success" | "danger" | "warning" | "info" }
> = {
  draft: { label: "Rascunho", variant: "default" },
  issued: { label: "Emitida", variant: "info" },
  sent: { label: "Enviada", variant: "info" },
  partially_paid: { label: "Parc. paga", variant: "warning" },
  paid: { label: "Paga", variant: "success" },
  overdue: { label: "Vencida", variant: "danger" },
  cancelled: { label: "Cancelada", variant: "default" },
}

export default async function InvoicesPage() {
  const session = await requireAuth()

  // Marcar vencidas automaticamente ao listar
  await markOverdueInvoices()

  const invoices = await prisma.invoice.findMany({
    where: { officeId: session.user.officeId },
    include: {
      client: true,
      serviceProvider: true,
      _count: { select: { items: true, paymentAllocations: true } },
    },
    orderBy: { issueDate: "desc" },
  })

  return (
    <div>
      <PageHeader
        title="Faturas"
        description="Faturas dos serviços prestados a clientes"
        action={
          <div className="flex gap-2">
            <Link href="/invoices/wizard">
              <Button variant="outline">
                <Wand2 className="h-4 w-4" />
                Geração em lote
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button>
                <Plus className="h-4 w-4" />
                Nova fatura
              </Button>
            </Link>
          </div>
        }
      />

      {invoices.length === 0 ? (
        <EmptyState message="Nenhuma fatura cadastrada ainda." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nº</TH>
              <TH>Cliente</TH>
              <TH>Prestador</TH>
              <TH>Competência</TH>
              <TH>Vencimento</TH>
              <TH>Total</TH>
              <TH>Pago</TH>
              <TH>Restante</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {invoices.map((inv) => {
              const info = STATUS_INFO[inv.status]
              return (
                <TR key={inv.id}>
                  <TD className="font-mono text-xs">{inv.invoiceNumber}</TD>
                  <TD className="font-medium text-gray-900">{inv.client.name}</TD>
                  <TD>{inv.serviceProvider.name}</TD>
                  <TD>
                    {String(inv.competencyMonth).padStart(2, "0")}/{inv.competencyYear}
                  </TD>
                  <TD>{formatDate(inv.dueDate)}</TD>
                  <TD className="font-semibold">{formatCurrency(Number(inv.totalAmount))}</TD>
                  <TD className="text-green-700">
                    {formatCurrency(Number(inv.paidAmount))}
                  </TD>
                  <TD className="text-red-700">
                    {formatCurrency(Number(inv.remainingAmount))}
                  </TD>
                  <TD>
                    <Badge variant={info.variant}>{info.label}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/invoices/${inv.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeleteButton
                        id={inv.id}
                        entityName={`Fatura ${inv.invoiceNumber}`}
                        action={deleteInvoice}
                      />
                    </div>
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}
    </div>
  )
}
