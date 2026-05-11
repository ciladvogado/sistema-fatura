import { z } from "zod"

export const bankAccountSchema = z.object({
  officeId: z.coerce.number().int().positive("Selecione um escritório"),
  bankName: z.string().min(2, "Nome do banco é obrigatório").max(80),
  bankCode: z.string().min(1, "Código do banco é obrigatório").max(10),
  agencyNumber: z.string().min(1, "Agência é obrigatória").max(20),
  accountNumber: z.string().min(1, "Conta é obrigatória").max(30),
  accountType: z.string().optional().nullable(),
  accountHolder: z.string().min(2, "Titular é obrigatório").max(120),
  pixKey: z.string().optional().nullable(),
  pixKeyType: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
})

export type BankAccountInput = z.infer<typeof bankAccountSchema>
