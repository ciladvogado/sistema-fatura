/**
 * Junta classes condicionalmente (similar ao clsx mas mais simples).
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ")
}

/**
 * Formata valor monetário em BRL.
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num)
}

/**
 * Formata data em pt-BR.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

/**
 * Formata CNPJ (00.000.000/0000-00) ou CPF (000.000.000-00).
 */
export function formatCnpjCpf(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }
  return value
}

/**
 * Formata telefone (XX) XXXXX-XXXX.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  }
  return value
}
