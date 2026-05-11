import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Card, CardBody, Badge } from "@/components/ui/Card"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { formatCurrency, formatDate } from "@/lib/utils"

const MONTHS_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
]

export default async function ReportsPage() {
  const session = await requireAuth()
  const officeId = session.user.officeId

  // Custo por cliente
  const byClient = await prisma.invoice.groupBy({
    by: ["clientId"],
    where: { officeId },
    _sum: { totalAmount: true, paidAmount: true, remainingAmount: true },
    _count: { id: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 20,
  })
  const clients = await prisma.client.findMany({
    where: { id: { in: byClient.map((b) => b.clientId) } },
  })
  const clientMap = new Map(clients.map((c) => [c.id, c]))

  // Custo por prestador
  const byProvider = await prisma.invoice.groupBy({
    by: ["serviceProviderId"],
    where: { officeId },
    _sum: { totalAmount: true, paidAmount: true, remainingAmount: true },
    _count: { id: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 20,
  })
  const providers = await prisma.serviceProvider.findMany({
    where: { id: { in: byProvider.map((b) => b.serviceProviderId) } },
  })
  const providerMap = new Map(providers.map((p) => [p.id, p]))

  // Faturas por mês (últimos 12 meses)
  const monthlyInvoices = await prisma.$queryRaw<
    Array<{ year: number; month: number; total: bigint; paid: bigint; count: bigint }>
  >`
    SELECT
      EXTRACT(YEAR FROM "issueDate")::int as year,
      EXTRACT(MONTH FROM "issueDate")::int as month,
      COALESCE(SUM("totalAmount"), 0)::bigint as total,
      COALESCE(SUM("paidAmount"), 0)::bigint as paid,
      COUNT(*)::bigint as count
    FROM "invoices"
    WHERE "officeId" = ${officeId}
      AND "issueDate" >= NOW() - INTERVAL '12 months'
    GROUP BY year, month
    ORDER BY year DESC, month DESC
  `

  // Status atual
  const statusCounts = await prisma.invoice.groupBy({
    by: ["status"],
    where: { officeId },
    _count: { id: true },
    _sum: { totalAmount: true, remainingAmount: true },
  })

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Análise consolidada do controle de terceirização"
      />

      {/* Faturas por status */}
      <Card className="mb-6">
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Distribuição de faturas por status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {statusCounts.map((s) => (
              <div
                key={s.status}
                className="p-3 bg-gray-50 rounded-md border border-gray-200"
              >
                <Badge>{s.status}</Badge>
                <p className="text-2xl font-bold mt-1">{s._count.id}</p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(Number(s._sum.totalAmount ?? 0))}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Custo por cliente */}
      <Card className="mb-6">
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Top 20 clientes (por custo total)
          </h3>
          {byClient.length === 0 ? (
            <EmptyState message="Nenhuma fatura cadastrada ainda" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Faturas</TH>
                  <TH>Total</TH>
                  <TH>Pago</TH>
                  <TH>Em aberto</TH>
                </TR>
              </THead>
              <TBody>
                {byClient.map((b) => {
                  const c = clientMap.get(b.clientId)
                  return (
                    <TR key={b.clientId}>
                      <TD className="font-medium">{c?.name ?? "?"}</TD>
                      <TD>{b._count.id}</TD>
                      <TD className="font-semibold">
                        {formatCurrency(Number(b._sum.totalAmount ?? 0))}
                      </TD>
                      <TD className="text-green-700">
                        {formatCurrency(Number(b._sum.paidAmount ?? 0))}
                      </TD>
                      <TD className="text-red-700">
                        {formatCurrency(Number(b._sum.remainingAmount ?? 0))}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Custo por prestador */}
      <Card className="mb-6">
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Top 20 prestadores (por custo total)
          </h3>
          {byProvider.length === 0 ? (
            <EmptyState message="Nenhuma fatura cadastrada ainda" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Prestador</TH>
                  <TH>Faturas</TH>
                  <TH>Total</TH>
                  <TH>Pago</TH>
                  <TH>Em aberto</TH>
                </TR>
              </THead>
              <TBody>
                {byProvider.map((b) => {
                  const p = providerMap.get(b.serviceProviderId)
                  return (
                    <TR key={b.serviceProviderId}>
                      <TD className="font-medium">{p?.name ?? "?"}</TD>
                      <TD>{b._count.id}</TD>
                      <TD className="font-semibold">
                        {formatCurrency(Number(b._sum.totalAmount ?? 0))}
                      </TD>
                      <TD className="text-green-700">
                        {formatCurrency(Number(b._sum.paidAmount ?? 0))}
                      </TD>
                      <TD className="text-red-700">
                        {formatCurrency(Number(b._sum.remainingAmount ?? 0))}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Evolução mensal */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Evolução mensal (últimos 12 meses)
          </h3>
          {monthlyInvoices.length === 0 ? (
            <EmptyState message="Sem dados suficientes" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Mês</TH>
                  <TH>Faturas</TH>
                  <TH>Total</TH>
                  <TH>Pago</TH>
                </TR>
              </THead>
              <TBody>
                {monthlyInvoices.map((m, idx) => (
                  <TR key={idx}>
                    <TD className="font-medium">
                      {MONTHS_NAMES[m.month - 1]}/{m.year}
                    </TD>
                    <TD>{Number(m.count)}</TD>
                    <TD className="font-semibold">
                      {formatCurrency(Number(m.total))}
                    </TD>
                    <TD className="text-green-700">
                      {formatCurrency(Number(m.paid))}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
