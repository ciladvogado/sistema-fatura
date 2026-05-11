"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input, Select, Checkbox } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { Card, CardBody, CardFooter } from "@/components/ui/Card"
import { createClient, updateClient } from "@/actions/clients"
import type { Client, Office } from "@prisma/client"
import { formatCnpjCpf } from "@/lib/utils"

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "suspended", label: "Suspenso" },
]

interface Props {
  client?: Client
  offices: Office[]
}

export function ClientForm({ client, offices }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [copyBilling, setCopyBilling] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(event.currentTarget)
    const result = client
      ? await updateClient(client.id, formData)
      : await createClient(formData)

    if (!result.success) {
      setError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setLoading(false)
      return
    }

    router.push("/clients")
    router.refresh()
  }

  function handleCopyAddress(form: HTMLFormElement) {
    const fields = ["Street", "Number", "Complement", "City", "State", "Zip"]
    fields.forEach((field) => {
      const billing = form.elements.namedItem(`billing${field}`) as HTMLInputElement | null
      const shipping = form.elements.namedItem(`shipping${field}`) as HTMLInputElement | null
      if (billing && shipping) {
        shipping.value = billing.value
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <Select
            name="officeId"
            label="Escritório responsável"
            required
            placeholder="Selecione o escritório"
            defaultValue={client?.officeId ?? ""}
            options={offices.map((o) => ({ value: o.id, label: o.name }))}
            error={fieldErrors.officeId?.[0]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="name"
              label="Razão social / Nome"
              required
              defaultValue={client?.name ?? ""}
              error={fieldErrors.name?.[0]}
            />
            <Input
              name="cnpjCpf"
              label="CNPJ ou CPF"
              required
              placeholder="00.000.000/0000-00"
              defaultValue={client?.cnpjCpf ? formatCnpjCpf(client.cnpjCpf) : ""}
              error={fieldErrors.cnpjCpf?.[0]}
            />
            <Input
              name="email"
              type="email"
              label="E-mail"
              required
              defaultValue={client?.email ?? ""}
              error={fieldErrors.email?.[0]}
            />
            <Input
              name="phone"
              label="Telefone"
              defaultValue={client?.phone ?? ""}
            />
            <Input
              name="website"
              label="Site"
              defaultValue={client?.website ?? ""}
            />
            <Select
              name="status"
              label="Status"
              defaultValue={client?.status ?? "active"}
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Endereço de cobrança
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-4">
                <Input
                  name="billingStreet"
                  label="Logradouro"
                  defaultValue={client?.billingStreet ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="billingNumber"
                  label="Número"
                  defaultValue={client?.billingNumber ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="billingComplement"
                  label="Compl."
                  defaultValue={client?.billingComplement ?? ""}
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  name="billingCity"
                  label="Cidade"
                  defaultValue={client?.billingCity ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="billingState"
                  label="UF"
                  maxLength={2}
                  defaultValue={client?.billingState ?? ""}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  name="billingZip"
                  label="CEP"
                  defaultValue={client?.billingZip ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Endereço de envio</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => handleCopyAddress(e.currentTarget.form!)}
              >
                Copiar endereço de cobrança
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-4">
                <Input
                  name="shippingStreet"
                  label="Logradouro"
                  defaultValue={client?.shippingStreet ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="shippingNumber"
                  label="Número"
                  defaultValue={client?.shippingNumber ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="shippingComplement"
                  label="Compl."
                  defaultValue={client?.shippingComplement ?? ""}
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  name="shippingCity"
                  label="Cidade"
                  defaultValue={client?.shippingCity ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="shippingState"
                  label="UF"
                  maxLength={2}
                  defaultValue={client?.shippingState ?? ""}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  name="shippingZip"
                  label="CEP"
                  defaultValue={client?.shippingZip ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Condições</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="paymentTermsDays"
                type="number"
                min={0}
                label="Prazo de pagamento (dias)"
                defaultValue={client?.paymentTermsDays ?? 30}
              />
              <Input
                name="creditLimit"
                type="number"
                step="0.01"
                min={0}
                label="Limite de crédito (R$)"
                defaultValue={
                  client?.creditLimit !== null && client?.creditLimit !== undefined
                    ? Number(client.creditLimit)
                    : ""
                }
              />
            </div>
            <div className="mt-3 space-y-2">
              <Checkbox
                name="isCreditAccount"
                label="Conta a crédito"
                description="Cliente paga em prazo combinado"
                defaultChecked={client?.isCreditAccount ?? false}
              />
              <Checkbox
                name="isActive"
                label="Cliente ativo"
                defaultChecked={client?.isActive ?? true}
              />
            </div>
          </div>
        </CardBody>
        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/clients")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : client ? "Atualizar" : "Criar cliente"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
