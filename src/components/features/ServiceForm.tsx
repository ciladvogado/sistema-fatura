"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input, Textarea, Select, Checkbox } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { Card, CardBody, CardFooter } from "@/components/ui/Card"
import { createService, updateService } from "@/actions/services"
import type { Service, ServiceProvider } from "@prisma/client"

const UNIT_TYPES = [
  { value: "unidade", label: "Unidade" },
  { value: "hora", label: "Hora" },
  { value: "mes", label: "Mês" },
  { value: "lote", label: "Lote" },
  { value: "pagina", label: "Página" },
]

interface Props {
  service?: Service
  providers: ServiceProvider[]
}

export function ServiceForm({ service, providers }: Props) {
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
    const result = service
      ? await updateService(service.id, formData)
      : await createService(formData)

    if (!result.success) {
      setError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setLoading(false)
      return
    }

    router.push("/services")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <Select
            name="serviceProviderId"
            label="Prestador responsável"
            required
            placeholder="Selecione o prestador"
            defaultValue={service?.serviceProviderId ?? ""}
            options={providers.map((p) => ({ value: p.id, label: p.name }))}
            error={fieldErrors.serviceProviderId?.[0]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="name"
              label="Nome do serviço"
              required
              defaultValue={service?.name ?? ""}
              error={fieldErrors.name?.[0]}
            />
            <Input
              name="serviceCode"
              label="Código (opcional)"
              hint="Único por prestador. Útil para identificação."
              defaultValue={service?.serviceCode ?? ""}
              error={fieldErrors.serviceCode?.[0]}
            />
          </div>

          <Textarea
            name="description"
            label="Descrição (opcional)"
            rows={3}
            defaultValue={service?.description ?? ""}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              name="basePrice"
              type="number"
              step="0.01"
              min={0}
              label="Preço base"
              required
              defaultValue={Number(service?.basePrice ?? 0)}
              error={fieldErrors.basePrice?.[0]}
            />
            <Select
              name="unitType"
              label="Unidade"
              placeholder="Selecione..."
              defaultValue={service?.unitType ?? ""}
              options={UNIT_TYPES}
            />
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-3">
            <Checkbox
              name="containsQuantity"
              label="Este serviço usa quantidade"
              description="Se desmarcado, a quantidade será fixa em 1 nas faturas (ex: mensalidade fixa)"
              defaultChecked={service?.containsQuantity ?? true}
            />
            <Checkbox
              name="isActive"
              label="Serviço ativo"
              defaultChecked={service?.isActive ?? true}
            />
          </div>
        </CardBody>
        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/services")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : service ? "Atualizar" : "Criar serviço"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
