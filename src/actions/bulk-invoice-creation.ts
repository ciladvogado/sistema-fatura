"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import type { ActionResult } from "@/types"
import { revalidatePath } from "next/cache"

export interface BulkInvoiceItem {
  clientId: number
  serviceId: number
  quantity: number
  unitPrice: number
}

export interface BulkInvoicePayload {
  serviceProviderId: number
  competencyMonth: number
  competencyYear: number
  issueDate: Date
  dueDate: Date
  items: BulkInvoiceItem[]
}

export async function bulkCreateInvoices(
  payload: BulkInvoicePayload,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const session = await requireAuth()

  if (payload.items.length === 0) {
    return { success: false, error: "Nenhum item informado" }
  }

  try {
    let created = 0
    let skipped = 0

    // Agrupa por cliente para criar 1 fatura por cliente
    const byClient = new Map<number, BulkInvoiceItem[]>()
    for (const item of payload.items) {
      if (item.quantity <= 0) continue
      if (!byClient.has(item.clientId)) byClient.set(item.clientId, [])
      byClient.get(item.clientId)!.push(item)
    }

    if (byClient.size === 0) {
      return { success: false, error: "Nenhum item com quantidade > 0" }
    }

    const services = await prisma.service.findMany({
      where: { id: { in: payload.items.map((i) => i.serviceId) } },
    })

    for (const [clientId, items] of byClient.entries()) {
      // Verificar se já existe fatura com mesma competência para este cliente/prestador
      const existing = await prisma.invoice.findFirst({
        where: {
          clientId,
          serviceProviderId: payload.serviceProviderId,
          competencyMonth: payload.competencyMonth,
          competencyYear: payload.competencyYear,
        },
      })
      if (existing) {
        skipped++
        continue
      }

      // Gera número de fatura automático
      const lastInvoice = await prisma.invoice.findFirst({
        where: { officeId: session.user.officeId },
        orderBy: { id: "desc" },
      })
      const nextNumber = `${payload.competencyYear}-${String(payload.competencyMonth).padStart(2, "0")}-${String(
        (lastInvoice?.id ?? 0) + created + 1,
      ).padStart(5, "0")}`

      let subtotal = 0
      const invoiceItems = items.map((it, idx) => {
        const svc = services.find((s) => s.id === it.serviceId)
        const line = it.quantity * it.unitPrice
        subtotal += line
        return {
          serviceId: it.serviceId,
          description: svc?.name ?? "Serviço",
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: line,
          taxPercent: 0,
          taxAmount: 0,
          lineOrder: idx + 1,
        }
      })

      await prisma.invoice.create({
        data: {
          officeId: session.user.officeId,
          clientId,
          serviceProviderId: payload.serviceProviderId,
          invoiceNumber: nextNumber,
          competencyMonth: payload.competencyMonth,
          competencyYear: payload.competencyYear,
          issueDate: payload.issueDate,
          dueDate: payload.dueDate,
          subtotal,
          discountAmount: 0,
          discountPercent: 0,
          taxAmount: 0,
          totalAmount: subtotal,
          paidAmount: 0,
          remainingAmount: subtotal,
          status: "issued",
          items: { create: invoiceItems },
        },
      })

      created++
    }

    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "create",
      entityType: "Invoice",
      description: `Geração em lote: ${created} fatura(s) criada(s), ${skipped} ignorada(s) (já existiam)`,
    })

    revalidatePath("/invoices")
    return {
      success: true,
      data: { created, skipped },
      message: `${created} fatura(s) criada(s)${skipped ? `, ${skipped} já existiam` : ""}`,
    }
  } catch (error) {
    logger.error({ error }, "Erro na geração em lote")
    return { success: false, error: "Erro ao gerar faturas em lote" }
  }
}
