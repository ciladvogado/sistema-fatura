import Link from "next/link"
import { requireAuth } from "@/lib/auth-utils"
import { PageHeader, Card, CardBody, Badge } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { prisma } from "@/lib/prisma"
import {
  FileText,
  CreditCard,
  Users,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Plus,
  Wand2,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { markOverdueInvoices } from "@/actions/invoices"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; providerId?: string }>
}) {
  const session = await requireAuth()
  const officeId = session.user.officeId
  const params = await searchParams

  await markOverdueInvoices()

  // Filtros
  const period = params.period ?? "30d"
  const providerId = params.providerId ? Number(params.providerId) : null

  const periodMap: Record<string, number> = {
    "30d": 30,
    "60d": 60,
    "90d": 90,
    "180d": 180,
    "365d": 365,
  }
  const days = periodMap[period] ?? 30
  const since = new Date(Date.now() - days * 86400000)

  const invoiceFilter = {
    officeId,
    issueDate: { gte: since },
    ...(providerId ? { serviceProviderId: providerId } : {}),
  }

  const [
    invoiceCount,
    paymentCount,
    clientCount,
    providerCount,
    totals,
    recentPayments,
    overdueInvoices,
    providersForFilter,
    byProvider,
  ] = await Promise.all([
    prisma.invoice.count({ where: invoiceFilter }),
    prisma.payment.count({
      where: {
        serviceProvider: { officeId },
        paymentDate: { gte: since },
        ...(providerId ? { serviceProviderId: providerId } : {}),
      },
    }),
    prisma.client.count({ where: { officeId, isActive: true } }),
    prisma.serviceProvider.count({ where: { officeId, isActive: true } }),
    prisma.invoice.aggregate({
      where: invoiceFilter,
      _sum: { remainingAmount: true, paidAmount: true, totalAmount: true },
    }),
    prisma.payment.findMany({
      where: { serviceProvider: { officeId } },
      include: { serviceProvider: true },
      orderBy: { paymentDate: "desc" },
      take: 4,
    }),
    prisma.invoice.findMany({
      where: { officeId, status: "overdue" },
      include: { client: true, serviceProvider: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.serviceProvider.findMany({
      where: { officeId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.groupBy({
      by: ["serviceProviderId"],
      where: invoiceFilter,
      _sum: { totalAmount: true, paidAmount: true, remainingAmount: true },
      orderBy: { _sum: { remainingAmount: "desc" } },
      take: 5,
    }),
  ])

  const providerMap = new Map(providersForFilter.map((p) => [p.id, p.name]))

  const metrics = [
    {
      label: "Faturas no período",
      value: invoiceCount,
      icon: FileText,
      color: "blue" as const,
      href: "/invoices",
    },
    {
      label: "Pagamentos no período",
      value: paymentCount,
      icon: CreditCard,
      color: "green" as const,
      href: "/payments",
    },
    {
      label: "Clientes ativos",
      value: clientCount,
      icon: Users,
      color: "purple" as const,
      href: "/clients",
    },
    {
      label: "Prestadores ativos",
      value: providerCount,
      icon: Briefcase,
      color: "orange" as const,
      href: "/service-providers",
    },
  ]

  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  }

  return (
    <div>
      <PageHeader
        title={`Bem-vindo, ${session.user.name}!`}
        description="Visão geral do controle de terceirização"
        action={
          <div className="flex gap-2">
            <Link href="/invoices/wizard">
              <Button variant="outline">
                <Wand2 className="h-4 w-4" />
                Wizard
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

      {/* Filtros */}
      <Card className="mb-6">
        <CardBody>
          <form className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Período
              </label>
              <select
                name="period"
                defaultValue={period}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="30d">Últimos 30 dias</option>
                <option value="60d">Últimos 60 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="180d">Últimos 180 dias</option>
                <option value="365d">Último ano</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Prestador
              </label>
              <select
                name="providerId"
                defaultValue={providerId ?? ""}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm min-w-48"
              >
                <option value="">Todos</option>
                {providersForFilter.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              Filtrar
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="ghost" size="sm">
                Limpar
              </Button>
            </Link>
          </form>
        </CardBody>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.label} href={m.href}>
              <Card className="hover:shadow-md transition cursor-pointer">
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{m.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{m.value}</p>
                    </div>
                    <div
                      className={`h-12 w-12 rounded-lg flex items-center justify-center border ${colorClasses[m.color]}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Custos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Custo total</h3>
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(Number(totals._sum.totalAmount ?? 0))}
            </p>
            <p className="text-xs text-gray-500 mt-1">Faturas no período</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Em aberto</h3>
              <TrendingUp className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(Number(totals._sum.remainingAmount ?? 0))}
            </p>
            <p className="text-xs text-gray-500 mt-1">A pagar aos prestadores</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Já pago</h3>
              <TrendingDown className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(Number(totals._sum.paidAmount ?? 0))}
            </p>
            <p className="text-xs text-gray-500 mt-1">Custo realizado</p>
          </CardBody>
        </Card>
      </div>

      {/* Listas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Top 5 prestadores em aberto
            </h3>
            {byProvider.length === 0 ? (
              <p className="text-sm text-gray-500">Sem dados no período.</p>
            ) : (
              <ul className="space-y-2">
                {byProvider.map((g) => (
                  <li
                    key={g.serviceProviderId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium text-sm">
                      {providerMap.get(g.serviceProviderId) ?? "Prestador"}
                    </span>
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(Number(g._sum.remainingAmount ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Pagamentos recentes
            </h3>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum pagamento ainda.</p>
            ) : (
              <ul className="space-y-2">
                {recentPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium text-sm">{p.serviceProvider.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(p.paymentDate)}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(Number(p.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {overdueInvoices.length > 0 && (
        <Card className="mt-4 border-red-200">
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-red-900">
                ⚠️ Faturas vencidas ({overdueInvoices.length})
              </h3>
              <Link href="/invoices?status=overdue">
                <Button variant="ghost" size="sm">
                  Ver todas
                </Button>
              </Link>
            </div>
            <ul className="space-y-2">
              {overdueInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between p-2 bg-red-50 rounded"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {inv.invoiceNumber} - {inv.client.name} ({inv.serviceProvider.name})
                    </p>
                    <p className="text-xs text-gray-600">
                      Venc. {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-red-700">
                      {formatCurrency(Number(inv.remainingAmount))}
                    </span>
                    <Badge variant="danger">Vencida</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
