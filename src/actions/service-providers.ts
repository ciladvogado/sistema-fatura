"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { serviceProviderSchema } from "@/schemas/service-provider"
import type { ActionResult } from "@/types"
import type { ServiceProvider } from "@prisma/client"
import { revalidatePath } from "next/cache"

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  return serviceProviderSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
    email: raw.email || null,
    phone: raw.phone || null,
    website: raw.website || null,
  })
}

export async function createServiceProvider(
  formData: FormData,
): Promise<ActionResult<ServiceProvider>> {
  const session = await requireRole(["ADMIN"])
  const parsed = parseForm(formData)

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const conflict = await prisma.serviceProvider.findFirst({
      where: { officeId: parsed.data.officeId, cnpjCpf: parsed.data.cnpjCpf },
    })
    if (conflict) {
      return {
        success: false,
        error: "Já existe um prestador com este CNPJ/CPF neste escritório",
      }
    }

    const provider = await prisma.serviceProvider.create({ data: parsed.data })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "create",
      entityType: "ServiceProvider",
      entityId: provider.id,
      description: `Prestador "${provider.name}" criado`,
    })

    revalidatePath("/service-providers")
    return { success: true, data: provider, message: "Prestador criado" }
  } catch (error) {
    logger.error({ error }, "Erro ao criar prestador")
    return { success: false, error: "Erro ao criar prestador" }
  }
}

export async function updateServiceProvider(
  id: number,
  formData: FormData,
): Promise<ActionResult<ServiceProvider>> {
  const session = await requireRole(["ADMIN"])
  const parsed = parseForm(formData)

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const conflict = await prisma.serviceProvider.findFirst({
      where: {
        officeId: parsed.data.officeId,
        cnpjCpf: parsed.data.cnpjCpf,
        id: { not: id },
      },
    })
    if (conflict) {
      return {
        success: false,
        error: "Já existe outro prestador com este CNPJ/CPF neste escritório",
      }
    }

    const provider = await prisma.serviceProvider.update({
      where: { id },
      data: parsed.data,
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "update",
      entityType: "ServiceProvider",
      entityId: provider.id,
      description: `Prestador "${provider.name}" atualizado`,
    })

    revalidatePath("/service-providers")
    revalidatePath(`/service-providers/${id}`)
    return { success: true, data: provider, message: "Prestador atualizado" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao atualizar prestador")
    return { success: false, error: "Erro ao atualizar prestador" }
  }
}

export async function deleteServiceProvider(id: number): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"])

  try {
    const provider = await prisma.serviceProvider.findUnique({ where: { id } })
    if (!provider) return { success: false, error: "Prestador não encontrado" }

    await prisma.serviceProvider.delete({ where: { id } })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "delete",
      entityType: "ServiceProvider",
      entityId: id,
      description: `Prestador "${provider.name}" excluído`,
    })

    revalidatePath("/service-providers")
    return { success: true, data: null, message: "Prestador excluído" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao excluir prestador")
    return {
      success: false,
      error:
        "Não foi possível excluir. Pode haver serviços, faturas ou pagamentos vinculados.",
    }
  }
}
