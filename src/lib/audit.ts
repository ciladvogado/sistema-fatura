import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import type { AuditAction } from "@prisma/client"

interface AuditLogParams {
  officeId: number
  userId?: string | null
  action: AuditAction
  entityType?: string
  entityId?: number
  description: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra uma ação no log de auditoria.
 * Não bloqueia o fluxo principal em caso de falha.
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        officeId: params.officeId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (error) {
    logger.error({ error, params }, "Falha ao registrar auditoria")
  }
}
