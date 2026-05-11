import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Card, CardBody } from "@/components/ui/Card"
import { Alert } from "@/components/ui/Alert"
import { formatCurrency } from "@/lib/utils"

export default async function SettingsPage() {
  const session = await requireRole(["ADMIN"])
  const officeId = session.user.officeId

  // Estatísticas gerais do escritório
  const [
    office,
    userCount,
    invoiceTotal,
    paymentTotal,
    auditLogCount,
    auditLogSize,
  ] = await Promise.all([
    prisma.office.findUnique({ where: { id: officeId } }),
    prisma.user.count({ where: { officeId } }),
    prisma.invoice.aggregate({
      where: { officeId },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { serviceProvider: { officeId } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.auditLog.count({ where: { officeId } }),
    prisma.$queryRaw<Array<{ size: bigint }>>`
      SELECT COALESCE(SUM(pg_column_size(audit_logs.*)), 0)::bigint AS size
      FROM audit_logs
      WHERE "officeId" = ${officeId}
    `,
  ])

  const sizeBytes = auditLogSize[0]?.size ? Number(auditLogSize[0].size) : 0
  const sizeMB = sizeBytes / 1024 / 1024

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Informações gerais do sistema e do seu escritório"
      />

      <Alert variant="info" title="Configurações disponíveis nesta versão">
        Nesta primeira versão do sistema, as configurações se limitam à visualização
        de informações do escritório. Funcionalidades adicionais (customização do
        dashboard, configuração de e-mail, etc.) serão adicionadas em versões
        futuras.
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Seu escritório
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600">Nome</dt>
                <dd className="font-medium">{office?.name}</dd>
              </div>
              <div>
                <dt className="text-gray-600">E-mail</dt>
                <dd className="font-medium">{office?.email}</dd>
              </div>
              <div>
                <dt className="text-gray-600">CNPJ</dt>
                <dd className="font-mono text-xs">{office?.cnpj ?? "Não informado"}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Usuários</dt>
                <dd className="font-medium">{userCount}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Estatísticas globais
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600">Total de faturas emitidas</dt>
                <dd className="font-medium">{invoiceTotal._count.id}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Valor total faturado</dt>
                <dd className="font-bold text-blue-700">
                  {formatCurrency(Number(invoiceTotal._sum.totalAmount ?? 0))}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600">Pagamentos registrados</dt>
                <dd className="font-medium">{paymentTotal._count.id}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Total já pago</dt>
                <dd className="font-bold text-green-700">
                  {formatCurrency(Number(paymentTotal._sum.amount ?? 0))}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Armazenamento de logs de auditoria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-gray-600">Total de registros</p>
                <p className="text-2xl font-bold text-gray-900">{auditLogCount}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-gray-600">Tamanho estimado</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sizeMB.toFixed(2)} MB
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-gray-600">Gerenciar logs</p>
                <a
                  href="/audit-logs"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Ir para Auditoria →
                </a>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
