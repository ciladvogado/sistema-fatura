import { z } from "zod"

export const clientSchema = z.object({
  officeId: z.coerce.number().int().positive("Selecione um escritório"),
  name: z.string().min(2, "Nome é obrigatório").max(120),
  cnpjCpf: z
    .string()
    .min(11, "CNPJ/CPF inválido")
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, "CNPJ/CPF deve ter 11 ou 14 dígitos"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),

  // Endereço de cobrança
  billingStreet: z.string().optional().nullable(),
  billingNumber: z.string().optional().nullable(),
  billingComplement: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  billingZip: z.string().optional().nullable(),

  // Endereço de envio
  shippingStreet: z.string().optional().nullable(),
  shippingNumber: z.string().optional().nullable(),
  shippingComplement: z.string().optional().nullable(),
  shippingCity: z.string().optional().nullable(),
  shippingState: z.string().optional().nullable(),
  shippingZip: z.string().optional().nullable(),

  // Comercial
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  creditLimit: z
    .union([z.coerce.number().nonnegative(), z.literal(""), z.null()])
    .transform((v) => (v === "" || v === null ? null : v))
    .optional(),
  isCreditAccount: z.boolean().default(false),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  isActive: z.boolean().default(true),
})

export type ClientInput = z.infer<typeof clientSchema>
