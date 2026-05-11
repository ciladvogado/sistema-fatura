import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { BankAccountForm } from "@/components/features/BankAccountForm"

export default async function EditBankAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["ADMIN"])
  const { id } = await params
  const [account, offices] = await Promise.all([
    prisma.bankAccount.findUnique({ where: { id: Number(id) } }),
    prisma.office.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ])

  if (!account) notFound()

  return (
    <div>
      <PageHeader title={`Editar conta: ${account.bankName} ${account.accountNumber}`} />
      <BankAccountForm account={account} offices={offices} />
    </div>
  )
}
