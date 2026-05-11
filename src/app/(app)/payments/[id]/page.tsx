import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Card, CardBody, Badge } from "@/components/ui/Card"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { ArrowLeft } from "lucide-react"

const METHOD_LABEL = {
  pix: "PIX",
  bank_transfer: "TED/DOC",
  credit_card: "Cartão crédito",
  debit_card: "Cartão débito",
  check: "Cheque",
  cash: "Dinheiro",
  other: "Outro",
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  const { id } = await params

  const payment = await prisma.payment.findUnique({
    where: { id: Number(id) },
    include: {
      serviceProvider: true,
      bankAccount: true,
      invoiceAllocations: { include: { invoice: { include: { client: true } } } },
    },
  })

  if (!payment || payment.serviceProvider.officeId !== session.user.officeId)
    notFound()

  return (
    <div>
      <PageHeader
        title={`Pagamento ${payment.paymentReference}`}
        description={`${payment.serviceProvider.name} · ${formatCurrency(Number(payment.amount))}`}
        action={
          <Link href="/payments">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Valor</p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(Number(payment.amount))}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Forma de pagamento</p>
            <p className="text-xl font-semibold text-gray-900">
              {METHOD_LABEL[payment.paymentMethod]}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Data</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatDate(payment.paymentDate)}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalhes</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-600">Status</dt>
              <dd>
                <Badge variant="success">{payment.paymentStatus}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-gray-600">Prestador</dt>
              <dd className="font-medium">{payment.serviceProvider.name}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Conta bancária</dt>
              <dd>
                {payment.bankAccount
                  ? `${payment.bankAccount.bankCode} - ${payment.bankAccount.bankName} (Ag. ${payment.bankAccount.agencyNumber} / Cc. ${payment.bankAccount.accountNumber})`
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600">Recibo</dt>
              <dd>{payment.receiptNumber ?? "-"}</dd>
            </div>
            {payment.notes && (
              <div className="md:col-span-2">
                <dt className="text-gray-600">Observações</dt>
                <dd className="bg-gray-50 p-2 rounded">{payment.notes}</dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Faturas pagas por este lançamento
          </h3>
          <Table>
            <THead>
              <TR>
                <TH>Fatura</TH>
                <TH>Cliente</TH>
                <TH>Total da fatura</TH>
                <TH>Valor alocado aqui</TH>
              </TR>
            </THead>
            <TBody>
              {payment.invoiceAllocations.map((alloc) => (
                <TR key={alloc.id}>
                  <TD className="font-mono text-xs">{alloc.invoice.invoiceNumber}</TD>
                  <TD>{alloc.invoice.client.name}</TD>
                  <TD>{formatCurrency(Number(alloc.invoice.totalAmount))}</TD>
                  <TD className="font-semibold text-green-700">
                    {formatCurrency(Number(alloc.allocatedAmount))}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  )
}
