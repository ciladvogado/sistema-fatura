import { z } from "zod"

export const invoiceItemSchema = z.object({
  id: z.coerce.number().optional(),
  serviceId: z.coerce.number().int().positive().optional().nullable(),
  description: z.string().min(1, "Descrição obrigatória").max(255),
  itemCode: z.string().optional().nullable(),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantidade inválida" })
    .positive("Quantidade deve ser maior que zero")
    .max(50, "Quantidade máxima: 50"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Preço inválido" })
    .nonnegative("Preço deve ser positivo"),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  lineOrder: z.coerce.number().int().default(1),
})

export const invoiceSchema = z.object({
  clientId: z.coerce.number().int().positive("Selecione um cliente"),
  serviceProviderId: z.coerce.number().int().positive("Selecione um prestador"),
  invoiceNumber: z.string().min(1, "Número obrigatório").max(60),
  referenceNumber: z.string().optional().nullable(),
  competencyMonth: z.coerce.number().int().min(1).max(12),
  competencyYear: z.coerce.number().int().min(2000).max(2100),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  discountAmount: z.coerce.number().nonnegative().default(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxAmount: z.coerce.number().nonnegative().default(0),
  status: z
    .enum(["draft", "issued", "sent", "partially_paid", "paid", "overdue", "cancelled"])
    .default("draft"),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "Adicione pelo menos um item"),
})

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>

export function calculateInvoiceTotals(input: {
  items: { quantity: number; unitPrice: number; taxPercent?: number }[]
  discountAmount?: number
  discountPercent?: number
  taxAmount?: number
}) {
  let subtotal = 0
  let taxFromItems = 0
  for (const item of input.items) {
    const line = item.quantity * item.unitPrice
    subtotal += line
    if (item.taxPercent) taxFromItems += (line * item.taxPercent) / 100
  }

  const discountFromPercent = (input.discountPercent ?? 0) > 0
    ? (subtotal * (input.discountPercent ?? 0)) / 100
    : 0
  const totalDiscount = (input.discountAmount ?? 0) + discountFromPercent
  const totalTax = (input.taxAmount ?? 0) + taxFromItems
  const total = Math.max(0, subtotal - totalDiscount + totalTax)

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(totalDiscount.toFixed(2)),
    taxAmount: Number(totalTax.toFixed(2)),
    totalAmount: Number(total.toFixed(2)),
  }
}
