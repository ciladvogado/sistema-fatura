"use server"

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-utils"
import { auditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import type { ActionResult } from "@/types"
import { revalidatePath } from "next/cache"

export async function deleteOldAuditLogs(
  cutoffDate: Date,
): Promise<ActionResult<{ count: number }>> {
  const session = await requireRole(["ADMIN"])

  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        officeId: session.user.officeId,
        createdAt: { lt: cutoffDate },
      },
    })

    // Logar a própria deleção
    await auditLog({
      officeId: session.user.officeId,
      userId: session.user.id,
      action: "delete",
      entityType: "AuditLog",
      description: `${result.count} log(s) de auditoria anterior(es) a ${cutoffDate.toISOString().split("T")[0]} excluído(s)`,
    })

    revalidatePath("/audit-logs")
    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} log(s) excluído(s)`,
    }
  } catch (error) {
    logger.error({ error, cutoffDate }, "Erro ao deletar logs antigos")
    return { success: false, error: "Erro ao deletar logs" }
  }
}
