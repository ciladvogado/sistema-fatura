import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { ServiceForm } from "@/components/features/ServiceForm"

export default async function NewServicePage() {
  await requireRole(["ADMIN"])
  const providers = await prisma.serviceProvider.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
  return (
    <div>
      <PageHeader title="Novo serviço" />
      <ServiceForm providers={providers} />
    </div>
  )
}
