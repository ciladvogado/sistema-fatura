import { z } from "zod"

export const serviceProviderSchema = z.object({
  officeId: z.coerce.number().int().positive("Selecione um escritório"),
  name: z.string().min(2, "Nome é obrigatório").max(120),
  cnpjCpf: z
    .string()
    .min(11, "CNPJ/CPF inválido")
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, "CNPJ/CPF deve ter 11 ou 14 dígitos"),
  email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  addressStreet: z.string().optional().nullable(),
  addressNumber: z.string().optional().nullable(),
  addressComplement: z.string().optional().nullable(),
  addressCity: z.string().optional().nullable(),
  addressState: z.string().optional().nullable(),
  addressZip: z.string().optional().nullable(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  defaultDiscountPercent: z.coerce.number().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
})

export type ServiceProviderInput = z.infer<typeof serviceProviderSchema>
