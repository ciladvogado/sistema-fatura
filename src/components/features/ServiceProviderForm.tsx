"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input, Select, Checkbox } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { Card, CardBody, CardFooter } from "@/components/ui/Card"
import {
  createServiceProvider,
  updateServiceProvider,
} from "@/actions/service-providers"
import type { ServiceProvider, Office } from "@prisma/client"
import { formatCnpjCpf } from "@/lib/utils"

interface Props {
  provider?: ServiceProvider
  offices: Office[]
}

export function ServiceProviderForm({ provider, offices }: Props) {
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
    const result = provider
      ? await updateServiceProvider(provider.id, formData)
      : await createServiceProvider(formData)

    if (!result.success) {
      setError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setLoading(false)
      return
    }

    router.push("/service-providers")
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
            defaultValue={provider?.officeId ?? ""}
            options={offices.map((o) => ({ value: o.id, label: o.name }))}
            error={fieldErrors.officeId?.[0]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="name"
              label="Nome / Razão social"
              required
              defaultValue={provider?.name ?? ""}
              error={fieldErrors.name?.[0]}
            />
            <Input
              name="cnpjCpf"
              label="CNPJ ou CPF"
              required
              placeholder="00.000.000/0000-00"
              defaultValue={provider?.cnpjCpf ? formatCnpjCpf(provider.cnpjCpf) : ""}
              error={fieldErrors.cnpjCpf?.[0]}
            />
            <Input
              name="email"
              type="email"
              label="E-mail"
              defaultValue={provider?.email ?? ""}
              error={fieldErrors.email?.[0]}
            />
            <Input
              name="phone"
              label="Telefone"
              defaultValue={provider?.phone ?? ""}
            />
            <Input
              name="website"
              label="Site"
              defaultValue={provider?.website ?? ""}
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-4">
                <Input
                  name="addressStreet"
                  label="Logradouro"
                  defaultValue={provider?.addressStreet ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="addressNumber"
                  label="Número"
                  defaultValue={provider?.addressNumber ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="addressComplement"
                  label="Compl."
                  defaultValue={provider?.addressComplement ?? ""}
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  name="addressCity"
                  label="Cidade"
                  defaultValue={provider?.addressCity ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="addressState"
                  label="UF"
                  maxLength={2}
                  defaultValue={provider?.addressState ?? ""}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  name="addressZip"
                  label="CEP"
                  defaultValue={provider?.addressZip ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Condições comerciais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="paymentTermsDays"
                type="number"
                min={0}
                label="Prazo de pagamento (dias)"
                defaultValue={provider?.paymentTermsDays ?? 30}
              />
              <Input
                name="defaultDiscountPercent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                label="Desconto padrão (%)"
                defaultValue={Number(provider?.defaultDiscountPercent ?? 0)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Checkbox
              name="isActive"
              label="Prestador ativo"
              defaultChecked={provider?.isActive ?? true}
            />
          </div>
        </CardBody>
        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/service-providers")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : provider ? "Atualizar" : "Criar prestador"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
