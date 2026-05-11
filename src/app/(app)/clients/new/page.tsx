import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { ClientForm } from "@/components/features/ClientForm"

export default async function NewClientPage() {
  const session = await requireAuth()
  const offices = await prisma.office.findMany({
    where:
      session.user.role === "ADMIN"
        ? { isActive: true }
        : { id: session.user.officeId, isActive: true },
    orderBy: { name: "asc" },
  })

  return (
    <div>
      <PageHeader title="Novo cliente" />
      <ClientForm offices={offices} />
    </div>
  )
}
