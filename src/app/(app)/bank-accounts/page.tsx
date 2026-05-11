import Link from "next/link"
import { requireRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader, Badge } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table"
import { Plus, Pencil, Star } from "lucide-react"
import { deleteBankAccount } from "@/actions/bank-accounts"
import { DeleteButton } from "@/components/features/DeleteButton"

export default async function BankAccountsPage() {
  await requireRole(["ADMIN"])
  const accounts = await prisma.bankAccount.findMany({
    include: { office: true },
    orderBy: [{ officeId: "asc" }, { createdAt: "asc" }],
  })

  return (
    <div>
      <PageHeader
        title="Contas Bancárias"
        description="Gerencie as contas bancárias usadas para pagamentos"
        action={
          <Link href="/bank-accounts/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nova conta
            </Button>
          </Link>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState message="Nenhuma conta bancária cadastrada." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Escritório</TH>
              <TH>Banco</TH>
              <TH>Agência/Conta</TH>
              <TH>Titular</TH>
              <TH>PIX</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {accounts.map((a) => (
              <TR key={a.id}>
                <TD>{a.office.name}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    {a.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <span className="font-medium">
                      {a.bankCode} - {a.bankName}
                    </span>
                  </div>
                </TD>
                <TD className="font-mono text-xs">
                  Ag. {a.agencyNumber} / Cc. {a.accountNumber}
                </TD>
                <TD>{a.accountHolder}</TD>
                <TD className="font-mono text-xs">{a.pixKey ?? "-"}</TD>
                <TD>
                  {a.isActive ? (
                    <Badge variant="success">Ativa</Badge>
                  ) : (
                    <Badge variant="danger">Inativa</Badge>
                  )}
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/bank-accounts/${a.id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DeleteButton
                      id={a.id}
                      entityName={`${a.bankName} ${a.accountNumber}`}
                      action={deleteBankAccount}
                    />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
