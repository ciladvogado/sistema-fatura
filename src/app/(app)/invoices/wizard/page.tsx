import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { InvoiceWizard } from "@/components/features/InvoiceWizard"

export default async function WizardPage() {
  const session = await requireAuth()
  const officeId = session.user.officeId

  const [clients, providers] = await Promise.all([
    prisma.client.findMany({
      where: { officeId, isActive: true, status: "active" },
      orderBy: { name: "asc" },
    }),
    prisma.serviceProvider.findMany({
      where: { officeId, isActive: true },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div>
      <PageHeader
        title="Geração em lote de faturas"
        description="Crie faturas em massa para múltiplos clientes em poucos passos"
      />
      <InvoiceWizard clients={clients} providers={providers} />
    </div>
  )
}
