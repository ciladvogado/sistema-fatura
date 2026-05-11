import Link from "next/link"
import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Badge } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { Plus, Pencil } from "lucide-react"
import { deleteService } from "@/actions/services"
import { DeleteButton } from "@/components/features/DeleteButton"
import { formatCurrency } from "@/lib/utils"

export default async function ServicesPage() {
  await requireRole(["ADMIN"])
  const services = await prisma.service.findMany({
    include: { serviceProvider: true },
    orderBy: [{ serviceProvider: { name: "asc" } }, { name: "asc" }],
  })

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="Catálogo de serviços oferecidos pelos prestadores"
        action={
          <Link href="/services/new">
            <Button>
              <Plus className="h-4 w-4" />
              Novo serviço
            </Button>
          </Link>
        }
      />

      {services.length === 0 ? (
        <EmptyState message="Nenhum serviço cadastrado ainda." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Serviço</TH>
              <TH>Prestador</TH>
              <TH>Código</TH>
              <TH>Preço base</TH>
              <TH>Quantidade</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {services.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium text-gray-900">{s.name}</TD>
                <TD>{s.serviceProvider.name}</TD>
                <TD className="font-mono text-xs">{s.serviceCode ?? "-"}</TD>
                <TD>{formatCurrency(Number(s.basePrice))}</TD>
                <TD>
                  {s.containsQuantity ? (
                    <Badge variant="info">Variável</Badge>
                  ) : (
                    <Badge variant="default">Fixa (1)</Badge>
                  )}
                </TD>
                <TD>
                  {s.isActive ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="danger">Inativo</Badge>
                  )}
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/services/${s.id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DeleteButton id={s.id} entityName={s.name} action={deleteService} />
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
