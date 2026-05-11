import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Card, CardBody, Badge } from "@/components/ui/Card"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { Alert } from "@/components/ui/Alert"
import { formatDate } from "@/lib/utils"
import { DeleteOldLogsButton } from "@/components/features/DeleteOldLogsButton"

const ACTION_LABELS = {
  login: "Login",
  logout: "Logout",
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  status_change: "Mudança de status",
  payment_recorded: "Pagamento",
}

const ACTION_VARIANT: Record<
  keyof typeof ACTION_LABELS,
  "default" | "info" | "success" | "warning" | "danger"
> = {
  login: "info",
  logout: "default",
  create: "success",
  update: "info",
  delete: "danger",
  status_change: "warning",
  payment_recorded: "success",
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; userId?: string }>
}) {
  const session = await requireRole(["ADMIN"])
  const params = await searchParams
  const officeId = session.user.officeId

  const where = {
    officeId,
    ...(params.action ? { action: params.action as any } : {}),
    ...(params.entity ? { entityType: params.entity } : {}),
    ...(params.userId ? { userId: params.userId } : {}),
  }

  const [logs, totalCount, oldest, storage, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.auditLog.count({ where: { officeId } }),
    prisma.auditLog.findFirst({
      where: { officeId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.$queryRaw<Array<{ size: bigint }>>`
      SELECT COALESCE(SUM(pg_column_size(audit_logs.*)), 0)::bigint AS size
      FROM audit_logs
      WHERE "officeId" = ${officeId}
    `,
    prisma.user.findMany({
      where: { officeId },
      orderBy: { name: "asc" },
    }),
  ])

  const sizeBytes = storage[0]?.size ? Number(storage[0].size) : 0
  const sizeMB = sizeBytes / 1024 / 1024
  const avgKB = totalCount > 0 ? sizeBytes / totalCount / 1024 : 0

  return (
    <div>
      <PageHeader
        title="Logs de Auditoria"
        description="Histórico completo de ações no sistema (somente Admin)"
      />

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-gray-600">Total de registros</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-gray-600">Tamanho estimado</p>
              <p className="text-2xl font-bold text-gray-900">{sizeMB.toFixed(2)} MB</p>
              <p className="text-xs text-gray-500">~{avgKB.toFixed(1)} KB/registro</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-gray-600">Registro mais antigo</p>
              <p className="text-lg font-semibold">
                {oldest ? formatDate(oldest.createdAt) : "-"}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded flex flex-col justify-center">
              <DeleteOldLogsButton />
            </div>
          </div>

          <Alert variant="info">
            Mostrando os 200 registros mais recentes. Use os filtros abaixo para refinar.
          </Alert>

          <form className="mt-4 flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ação</label>
              <select
                name="action"
                defaultValue={params.action ?? ""}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Todas</option>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Entidade
              </label>
              <select
                name="entity"
                defaultValue={params.entity ?? ""}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Todas</option>
                <option value="Office">Escritório</option>
                <option value="BankAccount">Conta Bancária</option>
                <option value="ServiceProvider">Prestador</option>
                <option value="Service">Serviço</option>
                <option value="Client">Cliente</option>
                <option value="Invoice">Fatura</option>
                <option value="Payment">Pagamento</option>
                <option value="AuditLog">Log</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Usuário
              </label>
              <select
                name="userId"
                defaultValue={params.userId ?? ""}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm min-w-48"
              >
                <option value="">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded"
            >
              Filtrar
            </button>
            <a
              href="/audit-logs"
              className="text-sm text-gray-600 hover:text-gray-900 px-2"
            >
              Limpar
            </a>
          </form>
        </CardBody>
      </Card>

      {logs.length === 0 ? (
        <EmptyState message="Nenhum log encontrado." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Data/Hora</TH>
              <TH>Usuário</TH>
              <TH>Ação</TH>
              <TH>Entidade</TH>
              <TH>Descrição</TH>
              <TH>IP</TH>
            </TR>
          </THead>
          <TBody>
            {logs.map((log) => (
              <TR key={log.id.toString()}>
                <TD className="font-mono text-xs">
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </TD>
                <TD className="text-sm">{log.user?.name ?? "Sistema"}</TD>
                <TD>
                  <Badge variant={ACTION_VARIANT[log.action]}>
                    {ACTION_LABELS[log.action]}
                  </Badge>
                </TD>
                <TD className="text-sm">
                  {log.entityType ?? "-"}
                  {log.entityId && (
                    <span className="text-gray-500 ml-1">#{log.entityId}</span>
                  )}
                </TD>
                <TD className="text-sm max-w-md truncate" title={log.description}>
                  {log.description}
                </TD>
                <TD className="font-mono text-xs text-gray-500">
                  {log.ipAddress ?? "-"}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
