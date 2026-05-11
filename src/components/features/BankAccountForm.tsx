"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input, Select, Checkbox } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { Card, CardBody, CardFooter } from "@/components/ui/Card"
import { createBankAccount, updateBankAccount } from "@/actions/bank-accounts"
import type { BankAccount, Office } from "@prisma/client"

const ACCOUNT_TYPES = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "pagamento", label: "Conta Pagamento" },
]

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave Aleatória" },
]

interface Props {
  account?: BankAccount
  offices: Office[]
}

export function BankAccountForm({ account, offices }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(event.currentTarget)
    const result = account
      ? await updateBankAccount(account.id, formData)
      : await createBankAccount(formData)

    if (!result.success) {
      setError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setLoading(false)
      return
    }

    router.push("/bank-accounts")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <Select
            name="officeId"
            label="Escritório"
            required
            placeholder="Selecione o escritório"
            defaultValue={account?.officeId ?? ""}
            options={offices.map((o) => ({ value: o.id, label: o.name }))}
            error={fieldErrors.officeId?.[0]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="bankName"
              label="Nome do banco"
              required
              defaultValue={account?.bankName ?? ""}
              error={fieldErrors.bankName?.[0]}
            />
            <Input
              name="bankCode"
              label="Código (Compe)"
              required
              defaultValue={account?.bankCode ?? ""}
              error={fieldErrors.bankCode?.[0]}
            />
            <Input
              name="agencyNumber"
              label="Agência"
              required
              defaultValue={account?.agencyNumber ?? ""}
              error={fieldErrors.agencyNumber?.[0]}
            />
            <Input
              name="accountNumber"
              label="Conta"
              required
              defaultValue={account?.accountNumber ?? ""}
              error={fieldErrors.accountNumber?.[0]}
            />
            <Select
              name="accountType"
              label="Tipo de conta"
              placeholder="Selecione..."
              defaultValue={account?.accountType ?? ""}
              options={ACCOUNT_TYPES}
            />
            <Input
              name="accountHolder"
              label="Titular"
              required
              defaultValue={account?.accountHolder ?? ""}
              error={fieldErrors.accountHolder?.[0]}
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">PIX (opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                name="pixKeyType"
                label="Tipo de chave"
                placeholder="Selecione..."
                defaultValue={account?.pixKeyType ?? ""}
                options={PIX_KEY_TYPES}
              />
              <Input
                name="pixKey"
                label="Chave PIX"
                defaultValue={account?.pixKey ?? ""}
                error={fieldErrors.pixKey?.[0]}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-3">
            <Checkbox
              name="isDefault"
              label="Conta padrão"
              description="Esta será a conta padrão do escritório selecionado"
              defaultChecked={account?.isDefault ?? false}
            />
            <Checkbox
              name="isActive"
              label="Conta ativa"
              defaultChecked={account?.isActive ?? true}
            />
          </div>
        </CardBody>
        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/bank-accounts")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : account ? "Atualizar" : "Criar conta"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
