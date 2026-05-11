"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input, Checkbox } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { Card, CardBody, CardFooter } from "@/components/ui/Card"
import { createOffice, updateOffice } from "@/actions/offices"
import type { Office } from "@prisma/client"

interface OfficeFormProps {
  office?: Office
}

export function OfficeForm({ office }: OfficeFormProps) {
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
    const result = office
      ? await updateOffice(office.id, formData)
      : await createOffice(formData)

    if (!result.success) {
      setError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setLoading(false)
      return
    }

    router.push("/offices")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="name"
              label="Nome do escritório"
              required
              defaultValue={office?.name ?? ""}
              error={fieldErrors.name?.[0]}
            />
            <Input
              name="email"
              type="email"
              label="E-mail"
              required
              defaultValue={office?.email ?? ""}
              error={fieldErrors.email?.[0]}
            />
            <Input
              name="cnpj"
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              defaultValue={office?.cnpj ?? ""}
              error={fieldErrors.cnpj?.[0]}
            />
            <Input
              name="phone"
              label="Telefone"
              defaultValue={office?.phone ?? ""}
              error={fieldErrors.phone?.[0]}
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-4">
                <Input
                  name="addressStreet"
                  label="Logradouro"
                  defaultValue={office?.addressStreet ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="addressNumber"
                  label="Número"
                  defaultValue={office?.addressNumber ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="addressComplement"
                  label="Complemento"
                  defaultValue={office?.addressComplement ?? ""}
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  name="addressCity"
                  label="Cidade"
                  defaultValue={office?.addressCity ?? ""}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  name="addressState"
                  label="UF"
                  maxLength={2}
                  defaultValue={office?.addressState ?? ""}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  name="addressZip"
                  label="CEP"
                  defaultValue={office?.addressZip ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Checkbox
              name="isActive"
              label="Escritório ativo"
              description="Desmarque para desativar este escritório"
              defaultChecked={office?.isActive ?? true}
            />
          </div>
        </CardBody>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/offices")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : office ? "Atualizar" : "Criar escritório"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
