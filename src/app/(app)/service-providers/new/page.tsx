import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { ServiceProviderForm } from "@/components/features/ServiceProviderForm"

export default async function NewServiceProviderPage() {
  await requireRole(["ADMIN"])
  const offices = await prisma.office.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
  return (
    <div>
      <PageHeader title="Novo prestador" />
      <ServiceProviderForm offices={offices} />
    </div>
  )
}
