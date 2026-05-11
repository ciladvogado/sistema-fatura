import { z } from "zod"

export const paymentAllocationSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  allocatedAmount: z.coerce.number().positive("Valor deve ser positivo"),
})

export const paymentSchema = z.object({
  serviceProviderId: z.coerce.number().int().positive("Selecione um prestador"),
  bankAccountId: z.coerce.number().int().positive().optional().nullable(),
  paymentReference: z.string().min(1, "Referência obrigatória").max(60),
  externalTransactionId: z.string().optional().nullable(),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  paymentMethod: z.enum([
    "bank_transfer",
    "credit_card",
    "debit_card",
    "pix",
    "check",
    "cash",
    "other",
  ]),
  paymentStatus: z
    .enum(["pending", "processing", "completed", "failed", "refunded", "reversed"])
    .default("completed"),
  paymentDate: z.coerce.date(),
  processedDate: z.coerce.date().optional().nullable(),
  clearedDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  allocations: z.array(paymentAllocationSchema).min(1, "Aloque a pelo menos uma fatura"),
})

export type PaymentInput = z.infer<typeof paymentSchema>
export type PaymentAllocationInput = z.infer<typeof paymentAllocationSchema>
