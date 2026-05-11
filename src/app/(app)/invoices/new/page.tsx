import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { InvoiceForm } from "@/components/features/InvoiceForm"

export default async function NewInvoicePage() {
  const session = await requireAuth()
  const officeId = session.user.officeId

  const [clients, providers] = await Promise.all([
    prisma.client.findMany({
      where: { officeId, isActive: true, status: "active" },
      orderBy: { name: "asc" },
    }),
    prisma.serviceProvider.findMany({
      where: { officeId, isActive: true },
      include: { services: { where: { isActive: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div>
      <PageHeader title="Nova fatura" description="Crie uma fatura manualmente" />
      <InvoiceForm clients={clients} providers={providers} />
    </div>
  )
}
