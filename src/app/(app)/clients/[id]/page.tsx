import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/Card"
import { ClientForm } from "@/components/features/ClientForm"

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  const { id } = await params
  const [client, offices] = await Promise.all([
    prisma.client.findUnique({ where: { id: Number(id) } }),
    prisma.office.findMany({
      where:
        session.user.role === "ADMIN"
          ? { isActive: true }
          : { id: session.user.officeId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!client) notFound()

  // Usuário padrão só pode editar clientes do próprio escritório
  if (
    session.user.role !== "ADMIN" &&
    client.officeId !== session.user.officeId
  ) {
    notFound()
  }

  return (
    <div>
      <PageHeader title={`Editar cliente: ${client.name}`} />
      <ClientForm client={client} offices={offices} />
    </div>
  )
}
