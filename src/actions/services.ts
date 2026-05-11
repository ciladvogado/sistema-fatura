"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { serviceSchema } from "@/schemas/service"
import type { ActionResult } from "@/types"
import type { Service } from "@prisma/client"
import { revalidatePath } from "next/cache"

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  return serviceSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
    containsQuantity: raw.containsQuantity === "on" || raw.containsQuantity === "true",
    description: raw.description || null,
    serviceCode: raw.serviceCode || null,
    unitType: raw.unitType || null,
  })
}

export async function createService(
  formData: FormData,
): Promise<ActionResult<Service>> {
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
    if (parsed.data.serviceCode) {
      const conflict = await prisma.service.findFirst({
        where: {
          serviceProviderId: parsed.data.serviceProviderId,
          serviceCode: parsed.data.serviceCode,
        },
      })
      if (conflict) {
        return {
          success: false,
          error: "Já existe um serviço com este código para este prestador",
        }
      }
    }

    const service = await prisma.service.create({ data: parsed.data })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "create",
      entityType: "Service",
      entityId: service.id,
      description: `Serviço "${service.name}" criado`,
    })

    revalidatePath("/services")
    return { success: true, data: service, message: "Serviço criado" }
  } catch (error) {
    logger.error({ error }, "Erro ao criar serviço")
    return { success: false, error: "Erro ao criar serviço" }
  }
}

export async function updateService(
  id: number,
  formData: FormData,
): Promise<ActionResult<Service>> {
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
    if (parsed.data.serviceCode) {
      const conflict = await prisma.service.findFirst({
        where: {
          serviceProviderId: parsed.data.serviceProviderId,
          serviceCode: parsed.data.serviceCode,
          id: { not: id },
        },
      })
      if (conflict) {
        return {
          success: false,
          error: "Já existe outro serviço com este código para este prestador",
        }
      }
    }

    const service = await prisma.service.update({ where: { id }, data: parsed.data })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "update",
      entityType: "Service",
      entityId: service.id,
      description: `Serviço "${service.name}" atualizado`,
    })

    revalidatePath("/services")
    revalidatePath(`/services/${id}`)
    return { success: true, data: service, message: "Serviço atualizado" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao atualizar serviço")
    return { success: false, error: "Erro ao atualizar serviço" }
  }
}

export async function deleteService(id: number): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"])

  try {
    const service = await prisma.service.findUnique({ where: { id } })
    if (!service) return { success: false, error: "Serviço não encontrado" }

    await prisma.service.delete({ where: { id } })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "delete",
      entityType: "Service",
      entityId: id,
      description: `Serviço "${service.name}" excluído`,
    })

    revalidatePath("/services")
    return { success: true, data: null, message: "Serviço excluído" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao excluir serviço")
    return {
      success: false,
      error: "Não foi possível excluir. Pode haver faturas vinculadas.",
    }
  }
}
