import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { ServiceProviderForm } from "@/components/features/ServiceProviderForm"

export default async function EditServiceProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["ADMIN"])
  const { id } = await params
  const [provider, offices] = await Promise.all([
    prisma.serviceProvider.findUnique({ where: { id: Number(id) } }),
    prisma.office.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ])

  if (!provider) notFound()

  return (
    <div>
      <PageHeader title={`Editar prestador: ${provider.name}`} />
      <ServiceProviderForm provider={provider} offices={offices} />
    </div>
  )
}
