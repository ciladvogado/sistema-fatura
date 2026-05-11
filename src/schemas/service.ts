import { z } from "zod"

export const serviceSchema = z.object({
  serviceProviderId: z.coerce.number().int().positive("Selecione um prestador"),
  name: z.string().min(2, "Nome é obrigatório").max(120),
  description: z.string().optional().nullable(),
  serviceCode: z.string().optional().nullable(),
  basePrice: z.coerce
    .number({ invalid_type_error: "Preço inválido" })
    .nonnegative("Preço deve ser positivo"),
  unitType: z.string().optional().nullable(),
  containsQuantity: z.boolean().default(true),
  isActive: z.boolean().default(true),
})

export type ServiceInput = z.infer<typeof serviceSchema>
