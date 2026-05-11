import Link from "next/link"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Badge } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { Plus, Eye } from "lucide-react"
import { deletePayment } from "@/actions/payments"
import { DeleteButton } from "@/components/features/DeleteButton"
import { formatCurrency, formatDate } from "@/lib/utils"

const STATUS_INFO = {
  pending: { label: "Pendente", variant: "warning" as const },
  processing: { label: "Processando", variant: "info" as const },
  completed: { label: "Concluído", variant: "success" as const },
  failed: { label: "Falhou", variant: "danger" as const },
  refunded: { label: "Reembolsado", variant: "default" as const },
  reversed: { label: "Estornado", variant: "default" as const },
}

const METHOD_LABEL = {
  pix: "PIX",
  bank_transfer: "TED/DOC",
  credit_card: "Cartão crédito",
  debit_card: "Cartão débito",
  check: "Cheque",
  cash: "Dinheiro",
  other: "Outro",
}

export default async function PaymentsPage() {
  const session = await requireAuth()

  const payments = await prisma.payment.findMany({
    where: { serviceProvider: { officeId: session.user.officeId } },
    include: {
      serviceProvider: true,
      bankAccount: true,
      invoiceAllocations: { include: { invoice: true } },
    },
    orderBy: { paymentDate: "desc" },
  })

  return (
    <div>
      <PageHeader
        title="Pagamentos a Prestadores"
        description="Registre pagamentos a prestadores e aloque a faturas em aberto"
        action={
          <Link href="/payments/new">
            <Button>
              <Plus className="h-4 w-4" />
              Novo pagamento
            </Button>
          </Link>
        }
      />

      {payments.length === 0 ? (
        <EmptyState message="Nenhum pagamento registrado ainda." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Referência</TH>
              <TH>Prestador</TH>
              <TH>Valor</TH>
              <TH>Faturas</TH>
              <TH>Método</TH>
              <TH>Data</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {payments.map((p) => {
              const info = STATUS_INFO[p.paymentStatus]
              return (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.paymentReference}</TD>
                  <TD className="font-medium text-gray-900">
                    {p.serviceProvider.name}
                  </TD>
                  <TD className="font-semibold text-green-700">
                    {formatCurrency(Number(p.amount))}
                  </TD>
                  <TD>
                    <span className="text-xs text-gray-600">
                      {p.invoiceAllocations.length} fatura(s):{" "}
                      {p.invoiceAllocations
                        .slice(0, 2)
                        .map((a) => a.invoice.invoiceNumber)
                        .join(", ")}
                      {p.invoiceAllocations.length > 2 &&
                        ` +${p.invoiceAllocations.length - 2}`}
                    </span>
                  </TD>
                  <TD>{METHOD_LABEL[p.paymentMethod]}</TD>
                  <TD>{formatDate(p.paymentDate)}</TD>
                  <TD>
                    <Badge variant={info.variant}>{info.label}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/payments/${p.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {session.user.role === "ADMIN" && (
                        <DeleteButton
                          id={p.id}
                          entityName={`Pagamento ${p.paymentReference}`}
                          action={deletePayment}
                          confirmText={`Estornar o pagamento ${p.paymentReference}? Isso reverterá os valores nas faturas.`}
                        />
                      )}
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
