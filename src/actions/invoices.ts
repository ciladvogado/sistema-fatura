"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import {
  invoiceSchema,
  calculateInvoiceTotals,
  type InvoiceInput,
} from "@/schemas/invoice"
import type { ActionResult } from "@/types"
import type { Invoice, InvoiceStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

interface CreateInvoiceData extends InvoiceInput {}

export async function createInvoice(
  data: CreateInvoiceData,
): Promise<ActionResult<Invoice>> {
  const session = await requireAuth()
  const parsed = invoiceSchema.safeParse(data)

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const totals = calculateInvoiceTotals({
      items: parsed.data.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxPercent: i.taxPercent,
      })),
      discountAmount: parsed.data.discountAmount,
      discountPercent: parsed.data.discountPercent,
      taxAmount: parsed.data.taxAmount,
    })

    // Validar unique composto
    const conflict = await prisma.invoice.findFirst({
      where: {
        clientId: parsed.data.clientId,
        serviceProviderId: parsed.data.serviceProviderId,
        competencyMonth: parsed.data.competencyMonth,
        competencyYear: parsed.data.competencyYear,
      },
    })
    if (conflict) {
      return {
        success: false,
        error:
          "Já existe uma fatura para este cliente/prestador nesta competência. Edite a existente.",
      }
    }

    const numberConflict = await prisma.invoice.findFirst({
      where: {
        officeId: session.user.officeId,
        invoiceNumber: parsed.data.invoiceNumber,
      },
    })
    if (numberConflict) {
      return {
        success: false,
        error: "Já existe uma fatura com este número neste escritório",
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        officeId: session.user.officeId,
        clientId: parsed.data.clientId,
        serviceProviderId: parsed.data.serviceProviderId,
        invoiceNumber: parsed.data.invoiceNumber,
        referenceNumber: parsed.data.referenceNumber,
        competencyMonth: parsed.data.competencyMonth,
        competencyYear: parsed.data.competencyYear,
        issueDate: parsed.data.issueDate,
        dueDate: parsed.data.dueDate,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        discountPercent: parsed.data.discountPercent,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        paidAmount: 0,
        remainingAmount: totals.totalAmount,
        status: parsed.data.status,
        notes: parsed.data.notes,
        internalNotes: parsed.data.internalNotes,
        items: {
          create: parsed.data.items.map((item, idx) => {
            const lineTotal = item.quantity * item.unitPrice
            const taxAmount = (lineTotal * (item.taxPercent ?? 0)) / 100
            return {
              serviceId: item.serviceId ?? null,
              description: item.description,
              itemCode: item.itemCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal,
              taxPercent: item.taxPercent ?? 0,
              taxAmount,
              lineOrder: item.lineOrder ?? idx + 1,
            }
          }),
        },
      },
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "create",
      entityType: "Invoice",
      entityId: invoice.id,
      description: `Fatura ${invoice.invoiceNumber} criada (${totals.totalAmount.toFixed(2)})`,
    })

    revalidatePath("/invoices")
    return { success: true, data: invoice, message: "Fatura criada com sucesso" }
  } catch (error) {
    logger.error({ error }, "Erro ao criar fatura")
    return { success: false, error: "Erro ao criar fatura" }
  }
}

export async function updateInvoice(
  id: number,
  data: CreateInvoiceData,
): Promise<ActionResult<Invoice>> {
  const session = await requireAuth()
  const parsed = invoiceSchema.safeParse(data)

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const existing = await prisma.invoice.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Fatura não encontrada" }
    if (existing.isLocked) {
      return { success: false, error: "Esta fatura está bloqueada para edição" }
    }
    if (Number(existing.paidAmount) > 0) {
      return {
        success: false,
        error: "Não é possível editar uma fatura com pagamentos. Cancele ou estorne primeiro.",
      }
    }

    const totals = calculateInvoiceTotals({
      items: parsed.data.items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxPercent: i.taxPercent,
      })),
      discountAmount: parsed.data.discountAmount,
      discountPercent: parsed.data.discountPercent,
      taxAmount: parsed.data.taxAmount,
    })

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
      return tx.invoice.update({
        where: { id },
        data: {
          clientId: parsed.data.clientId,
          serviceProviderId: parsed.data.serviceProviderId,
          invoiceNumber: parsed.data.invoiceNumber,
          referenceNumber: parsed.data.referenceNumber,
          competencyMonth: parsed.data.competencyMonth,
          competencyYear: parsed.data.competencyYear,
          issueDate: parsed.data.issueDate,
          dueDate: parsed.data.dueDate,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          discountPercent: parsed.data.discountPercent,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          remainingAmount: totals.totalAmount,
          status: parsed.data.status,
          notes: parsed.data.notes,
          internalNotes: parsed.data.internalNotes,
          items: {
            create: parsed.data.items.map((item, idx) => {
              const lineTotal = item.quantity * item.unitPrice
              const taxAmount = (lineTotal * (item.taxPercent ?? 0)) / 100
              return {
                serviceId: item.serviceId ?? null,
                description: item.description,
                itemCode: item.itemCode,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal,
                taxPercent: item.taxPercent ?? 0,
                taxAmount,
                lineOrder: item.lineOrder ?? idx + 1,
              }
            }),
          },
        },
      })
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "update",
      entityType: "Invoice",
      entityId: invoice.id,
      description: `Fatura ${invoice.invoiceNumber} atualizada`,
    })

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${id}`)
    return { success: true, data: invoice, message: "Fatura atualizada" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao atualizar fatura")
    return { success: false, error: "Erro ao atualizar fatura" }
  }
}

export async function changeInvoiceStatus(
  id: number,
  status: InvoiceStatus,
): Promise<ActionResult<Invoice>> {
  const session = await requireAuth()

  try {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status },
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "status_change",
      entityType: "Invoice",
      entityId: invoice.id,
      description: `Fatura ${invoice.invoiceNumber} alterada para status "${status}"`,
    })

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${id}`)
    return { success: true, data: invoice, message: "Status atualizado" }
  } catch (error) {
    logger.error({ error, id, status }, "Erro ao alterar status")
    return { success: false, error: "Erro ao alterar status" }
  }
}

export async function deleteInvoice(id: number): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"])

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return { success: false, error: "Fatura não encontrada" }

    if (Number(invoice.paidAmount) > 0) {
      return {
        success: false,
        error: "Não é possível excluir uma fatura com pagamentos. Cancele em vez disso.",
      }
    }

    await prisma.invoice.delete({ where: { id } })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "delete",
      entityType: "Invoice",
      entityId: id,
      description: `Fatura ${invoice.invoiceNumber} excluída`,
    })

    revalidatePath("/invoices")
    return { success: true, data: null, message: "Fatura excluída" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao excluir fatura")
    return { success: false, error: "Erro ao excluir fatura" }
  }
}

/**
 * Atualiza status das faturas vencidas automaticamente.
 */
export async function markOverdueInvoices(): Promise<number> {
  const now = new Date()
  const result = await prisma.invoice.updateMany({
    where: {
      dueDate: { lt: now },
      status: { in: ["issued", "sent", "partially_paid"] },
      remainingAmount: { gt: 0 },
    },
    data: { status: "overdue" },
  })
  return result.count
}
