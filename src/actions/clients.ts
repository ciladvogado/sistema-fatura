"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { clientSchema } from "@/schemas/client"
import type { ActionResult } from "@/types"
import type { Client } from "@prisma/client"
import { revalidatePath } from "next/cache"

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  return clientSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
    isCreditAccount: raw.isCreditAccount === "on" || raw.isCreditAccount === "true",
    phone: raw.phone || null,
    website: raw.website || null,
    creditLimit: raw.creditLimit || null,
  })
}

export async function createClient(
  formData: FormData,
): Promise<ActionResult<Client>> {
  const session = await requireAuth()
  const parsed = parseForm(formData)

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const conflict = await prisma.client.findFirst({
      where: { officeId: parsed.data.officeId, cnpjCpf: parsed.data.cnpjCpf },
    })
    if (conflict) {
      return {
        success: false,
        error: "Já existe um cliente com este CNPJ/CPF neste escritório",
      }
    }

    const client = await prisma.client.create({ data: parsed.data })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "create",
      entityType: "Client",
      entityId: client.id,
      description: `Cliente "${client.name}" cadastrado`,
    })

    revalidatePath("/clients")
    return { success: true, data: client, message: "Cliente criado" }
  } catch (error) {
    logger.error({ error }, "Erro ao criar cliente")
    return { success: false, error: "Erro ao criar cliente" }
  }
}

export async function updateClient(
  id: number,
  formData: FormData,
): Promise<ActionResult<Client>> {
  const session = await requireAuth()
  const parsed = parseForm(formData)

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const conflict = await prisma.client.findFirst({
      where: {
        officeId: parsed.data.officeId,
        cnpjCpf: parsed.data.cnpjCpf,
        id: { not: id },
      },
    })
    if (conflict) {
      return {
        success: false,
        error: "Já existe outro cliente com este CNPJ/CPF neste escritório",
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: parsed.data,
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "update",
      entityType: "Client",
      entityId: client.id,
      description: `Cliente "${client.name}" atualizado`,
    })

    revalidatePath("/clients")
    revalidatePath(`/clients/${id}`)
    return { success: true, data: client, message: "Cliente atualizado" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao atualizar cliente")
    return { success: false, error: "Erro ao atualizar cliente" }
  }
}

export async function deleteClient(id: number): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"])

  try {
    const client = await prisma.client.findUnique({ where: { id } })
    if (!client) return { success: false, error: "Cliente não encontrado" }

    await prisma.client.delete({ where: { id } })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "delete",
      entityType: "Client",
      entityId: id,
      description: `Cliente "${client.name}" excluído`,
    })

    revalidatePath("/clients")
    return { success: true, data: null, message: "Cliente excluído" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao excluir cliente")
    return {
      success: false,
      error: "Não foi possível excluir. Pode haver faturas vinculadas.",
    }
  }
}
