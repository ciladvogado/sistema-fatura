import Link from "next/link"
import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Badge } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { Plus, Pencil } from "lucide-react"
import { deleteServiceProvider } from "@/actions/service-providers"
import { DeleteButton } from "@/components/features/DeleteButton"
import { formatCnpjCpf } from "@/lib/utils"

export default async function ServiceProvidersPage() {
  await requireRole(["ADMIN"])
  const providers = await prisma.serviceProvider.findMany({
    include: {
      office: true,
      _count: { select: { services: true, invoices: true } },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div>
      <PageHeader
        title="Prestadores de Serviço"
        description="Cadastre os prestadores terceirizados que executam serviços para seus clientes"
        action={
          <Link href="/service-providers/new">
            <Button>
              <Plus className="h-4 w-4" />
              Novo prestador
            </Button>
          </Link>
        }
      />

      {providers.length === 0 ? (
        <EmptyState message="Nenhum prestador cadastrado." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>CNPJ/CPF</TH>
              <TH>Escritório</TH>
              <TH>E-mail</TH>
              <TH>Serviços</TH>
              <TH>Faturas</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {providers.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium text-gray-900">{p.name}</TD>
                <TD>{formatCnpjCpf(p.cnpjCpf)}</TD>
                <TD>{p.office.name}</TD>
                <TD>{p.email ?? "-"}</TD>
                <TD>{p._count.services}</TD>
                <TD>{p._count.invoices}</TD>
                <TD>
                  {p.isActive ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="danger">Inativo</Badge>
                  )}
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/service-providers/${p.id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DeleteButton
                      id={p.id}
                      entityName={p.name}
                      action={deleteServiceProvider}
                    />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
