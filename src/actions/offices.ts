"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { officeSchema } from "@/schemas/office"
import type { ActionResult } from "@/types"
import type { Office } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function createOffice(formData: FormData): Promise<ActionResult<Office>> {
  const session = await requireRole(["ADMIN"])

  const raw = Object.fromEntries(formData.entries())
  const parsed = officeSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
  })

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const exists = await prisma.office.findFirst({
      where: {
        OR: [
          { name: parsed.data.name },
          ...(parsed.data.cnpj ? [{ cnpj: parsed.data.cnpj }] : []),
          { email: parsed.data.email },
        ],
      },
    })
    if (exists) {
      return {
        success: false,
        error: "Já existe um escritório com este nome, CNPJ ou e-mail",
      }
    }

    const office = await prisma.office.create({
      data: parsed.data,
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "create",
      entityType: "Office",
      entityId: office.id,
      description: `Escritório "${office.name}" criado`,
    })

    revalidatePath("/offices")
    return { success: true, data: office, message: "Escritório criado com sucesso" }
  } catch (error) {
    logger.error({ error }, "Erro ao criar escritório")
    return { success: false, error: "Erro ao criar escritório" }
  }
}

export async function updateOffice(
  id: number,
  formData: FormData,
): Promise<ActionResult<Office>> {
  const session = await requireRole(["ADMIN"])

  const raw = Object.fromEntries(formData.entries())
  const parsed = officeSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
  })

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const conflict = await prisma.office.findFirst({
      where: {
        id: { not: id },
        OR: [
          { name: parsed.data.name },
          ...(parsed.data.cnpj ? [{ cnpj: parsed.data.cnpj }] : []),
          { email: parsed.data.email },
        ],
      },
    })
    if (conflict) {
      return {
        success: false,
        error: "Já existe outro escritório com este nome, CNPJ ou e-mail",
      }
    }

    const office = await prisma.office.update({
      where: { id },
      data: parsed.data,
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "update",
      entityType: "Office",
      entityId: office.id,
      description: `Escritório "${office.name}" atualizado`,
    })

    revalidatePath("/offices")
    revalidatePath(`/offices/${id}`)
    return { success: true, data: office, message: "Escritório atualizado" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao atualizar escritório")
    return { success: false, error: "Erro ao atualizar escritório" }
  }
}

export async function deleteOffice(id: number): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"])

  try {
    const office = await prisma.office.findUnique({ where: { id } })
    if (!office) {
      return { success: false, error: "Escritório não encontrado" }
    }

    // Não permitir excluir o próprio escritório do usuário
    if (id === session.user.officeId) {
      return { success: false, error: "Você não pode excluir seu próprio escritório" }
    }

    await prisma.office.delete({ where: { id } })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "delete",
      entityType: "Office",
      entityId: id,
      description: `Escritório "${office.name}" excluído`,
    })

    revalidatePath("/offices")
    return { success: true, data: null, message: "Escritório excluído" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao excluir escritório")
    return {
      success: false,
      error: "Não foi possível excluir. Pode haver dados vinculados.",
    }
  }
}
