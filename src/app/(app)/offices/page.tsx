import Link from "next/link"
import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Badge } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { Plus, Pencil } from "lucide-react"
import { deleteOffice } from "@/actions/offices"
import { DeleteButton } from "@/components/features/DeleteButton"
import { formatCnpjCpf } from "@/lib/utils"

export default async function OfficesPage() {
  await requireRole(["ADMIN"])
  const offices = await prisma.office.findMany({
    orderBy: { createdAt: "asc" },
  })

  return (
    <div>
      <PageHeader
        title="Escritórios"
        description="Gerencie as filiais/escritórios do sistema"
        action={
          <Link href="/offices/new">
            <Button>
              <Plus className="h-4 w-4" />
              Novo escritório
            </Button>
          </Link>
        }
      />

      {offices.length === 0 ? (
        <EmptyState message="Nenhum escritório cadastrado ainda." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>E-mail</TH>
              <TH>CNPJ</TH>
              <TH>Cidade/UF</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {offices.map((o) => (
              <TR key={o.id}>
                <TD className="font-medium text-gray-900">{o.name}</TD>
                <TD>{o.email}</TD>
                <TD>{o.cnpj ? formatCnpjCpf(o.cnpj) : "-"}</TD>
                <TD>
                  {o.addressCity || "-"}
                  {o.addressState ? ` / ${o.addressState}` : ""}
                </TD>
                <TD>
                  {o.isActive ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="danger">Inativo</Badge>
                  )}
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/offices/${o.id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DeleteButton id={o.id} entityName={o.name} action={deleteOffice} />
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
