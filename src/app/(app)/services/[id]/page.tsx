import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { ServiceForm } from "@/components/features/ServiceForm"

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["ADMIN"])
  const { id } = await params
  const [service, providers] = await Promise.all([
    prisma.service.findUnique({ where: { id: Number(id) } }),
    prisma.serviceProvider.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!service) notFound()

  return (
    <div>
      <PageHeader title={`Editar serviço: ${service.name}`} />
      <ServiceForm service={service} providers={providers} />
    </div>
  )
}
