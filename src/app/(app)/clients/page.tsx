import Link from "next/link"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Badge } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { Plus, Pencil } from "lucide-react"
import { deleteClient } from "@/actions/clients"
import { DeleteButton } from "@/components/features/DeleteButton"
import { formatCnpjCpf } from "@/lib/utils"

const STATUS_BADGE = {
  active: { variant: "success" as const, label: "Ativo" },
  inactive: { variant: "default" as const, label: "Inativo" },
  suspended: { variant: "warning" as const, label: "Suspenso" },
}

export default async function ClientsPage() {
  const session = await requireAuth()
  const isAdmin = session.user.role === "ADMIN"

  const clients = await prisma.client.findMany({
    where: isAdmin ? undefined : { officeId: session.user.officeId },
    include: {
      office: true,
      _count: { select: { invoices: true } },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Clientes do seu escritório (destinatários dos serviços terceirizados)"
        action={
          <Link href="/clients/new">
            <Button>
              <Plus className="h-4 w-4" />
              Novo cliente
            </Button>
          </Link>
        }
      />

      {clients.length === 0 ? (
        <EmptyState message="Nenhum cliente cadastrado ainda." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>CNPJ/CPF</TH>
              <TH>E-mail</TH>
              {isAdmin && <TH>Escritório</TH>}
              <TH>Faturas</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {clients.map((c) => {
              const badge = STATUS_BADGE[c.status]
              return (
                <TR key={c.id}>
                  <TD className="font-medium text-gray-900">{c.name}</TD>
                  <TD>{formatCnpjCpf(c.cnpjCpf)}</TD>
                  <TD>{c.email}</TD>
                  {isAdmin && <TD>{c.office.name}</TD>}
                  <TD>{c._count.invoices}</TD>
                  <TD>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/clients/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      {isAdmin && (
                        <DeleteButton
                          id={c.id}
                          entityName={c.name}
                          action={deleteClient}
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
