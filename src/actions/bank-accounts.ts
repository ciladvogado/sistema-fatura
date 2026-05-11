"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { bankAccountSchema } from "@/schemas/bank-account"
import type { ActionResult } from "@/types"
import type { BankAccount } from "@prisma/client"
import { revalidatePath } from "next/cache"

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  return bankAccountSchema.safeParse({
    ...raw,
    isActive: raw.isActive === "on" || raw.isActive === "true",
    isDefault: raw.isDefault === "on" || raw.isDefault === "true",
    pixKey: raw.pixKey || null,
    pixKeyType: raw.pixKeyType || null,
    accountType: raw.accountType || null,
  })
}

export async function createBankAccount(
  formData: FormData,
): Promise<ActionResult<BankAccount>> {
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
    if (parsed.data.pixKey) {
      const pixConflict = await prisma.bankAccount.findUnique({
        where: { pixKey: parsed.data.pixKey },
      })
      if (pixConflict) {
        return { success: false, error: "Chave PIX já cadastrada em outra conta" }
      }
    }

    const account = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.bankAccount.updateMany({
          where: { officeId: parsed.data.officeId, isDefault: true },
          data: { isDefault: false },
        })
      }
      return tx.bankAccount.create({ data: parsed.data })
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "create",
      entityType: "BankAccount",
      entityId: account.id,
      description: `Conta bancária "${account.bankName} ${account.accountNumber}" criada`,
    })

    revalidatePath("/bank-accounts")
    return { success: true, data: account, message: "Conta criada" }
  } catch (error) {
    logger.error({ error }, "Erro ao criar conta bancária")
    return { success: false, error: "Erro ao criar conta bancária" }
  }
}

export async function updateBankAccount(
  id: number,
  formData: FormData,
): Promise<ActionResult<BankAccount>> {
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
    if (parsed.data.pixKey) {
      const pixConflict = await prisma.bankAccount.findFirst({
        where: { pixKey: parsed.data.pixKey, id: { not: id } },
      })
      if (pixConflict) {
        return { success: false, error: "Chave PIX já cadastrada em outra conta" }
      }
    }

    const account = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.bankAccount.updateMany({
          where: {
            officeId: parsed.data.officeId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }
      return tx.bankAccount.update({ where: { id }, data: parsed.data })
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "update",
      entityType: "BankAccount",
      entityId: account.id,
      description: `Conta bancária "${account.bankName} ${account.accountNumber}" atualizada`,
    })

    revalidatePath("/bank-accounts")
    revalidatePath(`/bank-accounts/${id}`)
    return { success: true, data: account, message: "Conta atualizada" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao atualizar conta bancária")
    return { success: false, error: "Erro ao atualizar conta" }
  }
}

export async function deleteBankAccount(id: number): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"])

  try {
    const account = await prisma.bankAccount.findUnique({ where: { id } })
    if (!account) return { success: false, error: "Conta não encontrada" }

    await prisma.bankAccount.delete({ where: { id } })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "delete",
      entityType: "BankAccount",
      entityId: id,
      description: `Conta bancária "${account.bankName} ${account.accountNumber}" excluída`,
    })

    revalidatePath("/bank-accounts")
    return { success: true, data: null, message: "Conta excluída" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao excluir conta")
    return {
      success: false,
      error: "Não foi possível excluir. Pode haver pagamentos vinculados.",
    }
  }
}
