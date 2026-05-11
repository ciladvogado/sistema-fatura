import { requireRole } from "@/lib/auth-utils"
import { PageHeader } from "@/components/ui/Card"
import { OfficeForm } from "@/components/features/OfficeForm"

export default async function NewOfficePage() {
  await requireRole(["ADMIN"])

  return (
    <div>
      <PageHeader
        title="Novo escritório"
        description="Cadastre uma nova filial/escritório"
      />
      <OfficeForm />
    </div>
  )
}
