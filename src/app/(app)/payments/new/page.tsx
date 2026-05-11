import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { PaymentForm } from "@/components/features/PaymentForm"

export default async function NewPaymentPage() {
  const session = await requireAuth()
  const officeId = session.user.officeId

  const [providers, bankAccounts] = await Promise.all([
    prisma.serviceProvider.findMany({
      where: { officeId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: { officeId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { bankName: "asc" }],
    }),
  ])

  return (
    <div>
      <PageHeader
        title="Novo pagamento"
        description="Selecione o prestador e aloque o valor a faturas em aberto"
      />
      <PaymentForm
        providers={providers}
        bankAccounts={bankAccounts}
        officeId={officeId}
      />
    </div>
  )
}
