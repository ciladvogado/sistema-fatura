import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { BankAccountForm } from "@/components/features/BankAccountForm"

export default async function NewBankAccountPage() {
  await requireRole(["ADMIN"])
  const offices = await prisma.office.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  return (
    <div>
      <PageHeader title="Nova conta bancária" />
      <BankAccountForm offices={offices} />
    </div>
  )
}
