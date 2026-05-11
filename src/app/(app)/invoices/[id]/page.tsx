import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { InvoiceForm } from "@/components/features/InvoiceForm"

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  const { id } = await params

  const [invoice, clients, providers] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    }),
    prisma.client.findMany({
      where: { officeId: session.user.officeId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceProvider.findMany({
      where: { officeId: session.user.officeId, isActive: true },
      include: { services: { where: { isActive: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ])

  if (!invoice || invoice.officeId !== session.user.officeId) notFound()

  return (
    <div>
      <PageHeader
        title={`Fatura ${invoice.invoiceNumber}`}
        description="Edite a fatura ou seus itens"
      />
      <InvoiceForm invoice={invoice} clients={clients} providers={providers} />
    </div>
  )
}
