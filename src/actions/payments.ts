"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { paymentSchema, type PaymentInput } from "@/schemas/payment"
import type { ActionResult } from "@/types"
import type { Payment } from "@prisma/client"
import { revalidatePath } from "next/cache"

function recomputeInvoiceStatus(
  paidAmount: number,
  totalAmount: number,
  currentStatus: string,
): string {
  if (currentStatus === "cancelled") return "cancelled"
  if (paidAmount >= totalAmount) return "paid"
  if (paidAmount > 0) return "partially_paid"
  if (currentStatus === "paid" || currentStatus === "partially_paid") return "issued"
  return currentStatus
}

export async function createPayment(
  data: PaymentInput,
): Promise<ActionResult<Payment>> {
  const session = await requireAuth()
  const parsed = paymentSchema.safeParse(data)

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // Validar soma das alocações
  const totalAllocated = parsed.data.allocations.reduce(
    (acc, a) => acc + a.allocatedAmount,
    0,
  )
  if (Math.abs(totalAllocated - parsed.data.amount) > 0.01) {
    return {
      success: false,
      error: `Soma das alocações (${totalAllocated.toFixed(2)}) difere do valor do pagamento (${parsed.data.amount.toFixed(2)})`,
    }
  }

  try {
    const refConflict = await prisma.payment.findUnique({
      where: { paymentReference: parsed.data.paymentReference },
    })
    if (refConflict) {
      return { success: false, error: "Referência de pagamento já utilizada" }
    }

    // Validar invoices e calcular novos valores
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: parsed.data.allocations.map((a) => a.invoiceId) },
        officeId: session.user.officeId,
        serviceProviderId: parsed.data.serviceProviderId,
      },
    })

    if (invoices.length !== parsed.data.allocations.length) {
      return {
        success: false,
        error: "Uma ou mais faturas selecionadas não pertencem a este prestador",
      }
    }

    for (const alloc of parsed.data.allocations) {
      const inv = invoices.find((i) => i.id === alloc.invoiceId)!
      if (alloc.allocatedAmount > Number(inv.remainingAmount) + 0.01) {
        return {
          success: false,
          error: `Alocação de ${alloc.allocatedAmount.toFixed(2)} excede o saldo da fatura ${inv.invoiceNumber} (${Number(inv.remainingAmount).toFixed(2)})`,
        }
      }
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          serviceProviderId: parsed.data.serviceProviderId,
          bankAccountId: parsed.data.bankAccountId,
          paymentReference: parsed.data.paymentReference,
          externalTransactionId: parsed.data.externalTransactionId,
          amount: parsed.data.amount,
          paymentMethod: parsed.data.paymentMethod,
          paymentStatus: parsed.data.paymentStatus,
          paymentDate: parsed.data.paymentDate,
          processedDate: parsed.data.processedDate,
          clearedDate: parsed.data.clearedDate,
          notes: parsed.data.notes,
          receiptNumber: parsed.data.receiptNumber,
          invoiceAllocations: {
            create: parsed.data.allocations.map((a) => ({
              invoiceId: a.invoiceId,
              allocatedAmount: a.allocatedAmount,
            })),
          },
        },
      })

      // Atualizar valores e status das faturas
      for (const alloc of parsed.data.allocations) {
        const inv = invoices.find((i) => i.id === alloc.invoiceId)!
        const newPaid = Number(inv.paidAmount) + alloc.allocatedAmount
        const newRemaining = Number(inv.totalAmount) - newPaid
        const newStatus = recomputeInvoiceStatus(
          newPaid,
          Number(inv.totalAmount),
          inv.status,
        ) as any

        await tx.invoice.update({
          where: { id: alloc.invoiceId },
          data: {
            paidAmount: newPaid,
            remainingAmount: Math.max(0, newRemaining),
            status: newStatus,
          },
        })
      }

      return created
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "payment_recorded",
      entityType: "Payment",
      entityId: payment.id,
      description: `Pagamento ${payment.paymentReference} de ${parsed.data.amount.toFixed(2)} registrado, ${parsed.data.allocations.length} fatura(s) alocada(s)`,
    })

    revalidatePath("/payments")
    revalidatePath("/invoices")
    return { success: true, data: payment, message: "Pagamento registrado" }
  } catch (error) {
    logger.error({ error }, "Erro ao criar pagamento")
    return { success: false, error: "Erro ao registrar pagamento" }
  }
}

export async function deletePayment(id: number): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"])

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoiceAllocations: true },
    })
    if (!payment) return { success: false, error: "Pagamento não encontrado" }

    await prisma.$transaction(async (tx) => {
      // Reverter valores nas faturas
      for (const alloc of payment.invoiceAllocations) {
        const inv = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } })
        if (!inv) continue
        const newPaid = Math.max(
          0,
          Number(inv.paidAmount) - Number(alloc.allocatedAmount),
        )
        const newRemaining = Number(inv.totalAmount) - newPaid
        const newStatus = recomputeInvoiceStatus(
          newPaid,
          Number(inv.totalAmount),
          inv.status,
        ) as any
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
          },
        })
      }
      await tx.payment.delete({ where: { id } })
    })

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "delete",
      entityType: "Payment",
      entityId: id,
      description: `Pagamento ${payment.paymentReference} estornado/excluído`,
    })

    revalidatePath("/payments")
    revalidatePath("/invoices")
    return { success: true, data: null, message: "Pagamento estornado" }
  } catch (error) {
    logger.error({ error, id }, "Erro ao excluir pagamento")
    return { success: false, error: "Erro ao excluir pagamento" }
  }
}

/**
 * Carrega faturas em aberto de um prestador (para alocação).
 */
export async function getOpenInvoicesForProvider(
  serviceProviderId: number,
  officeId: number,
) {
  return prisma.invoice.findMany({
    where: {
      officeId,
      serviceProviderId,
      remainingAmount: { gt: 0 },
      status: { in: ["issued", "sent", "partially_paid", "overdue", "draft"] },
    },
    include: { client: true },
    orderBy: { dueDate: "asc" },
  })
}
