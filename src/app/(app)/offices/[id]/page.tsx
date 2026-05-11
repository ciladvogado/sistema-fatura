import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { OfficeForm } from "@/components/features/OfficeForm"

export default async function EditOfficePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["ADMIN"])
  const { id } = await params
  const office = await prisma.office.findUnique({ where: { id: Number(id) } })

  if (!office) notFound()

  return (
    <div>
      <PageHeader
        title={`Editar: ${office.name}`}
        description="Atualize as informações do escritório"
      />
      <OfficeForm office={office} />
    </div>
  )
}
