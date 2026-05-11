import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const office = await prisma.office.findFirst()
  if (!office) return

  // Pega uma conta bancária e um prestador com faturas em aberto
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { officeId: office.id },
  })

  const providerWithInvoices = await prisma.serviceProvider.findFirst({
    where: {
      officeId: office.id,
      invoices: {
        some: {
          remainingAmount: { gt: 0 },
          status: { in: ["issued", "sent", "draft"] },
        },
      },
    },
    include: {
      invoices: {
        where: {
          remainingAmount: { gt: 0 },
          status: { in: ["issued", "sent", "draft"] },
        },
        take: 2,
      },
    },
  })

  if (!providerWithInvoices || providerWithInvoices.invoices.length === 0) {
    console.log("Sem faturas em aberto. Pulando seed de pagamento.")
    return
  }

  // Verifica se já tem pagamento de demo
  const existing = await prisma.payment.findFirst({
    where: { paymentReference: "DEMO-PIX-001" },
  })
  if (existing) {
    console.log("Pagamento de demo já existe.")
    return
  }

  const invoice = providerWithInvoices.invoices[0]
  const amount = Number(invoice.remainingAmount)

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        serviceProviderId: providerWithInvoices.id,
        bankAccountId: bankAccount?.id,
        paymentReference: "DEMO-PIX-001",
        amount,
        paymentMethod: "pix",
        paymentStatus: "completed",
        paymentDate: new Date(),
        processedDate: new Date(),
        notes: "Pagamento de exemplo gerado automaticamente",
        invoiceAllocations: {
          create: {
            invoiceId: invoice.id,
            allocatedAmount: amount,
          },
        },
      },
    })

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: amount,
        remainingAmount: 0,
        status: "paid",
      },
    })
  })

  console.log(`✅ Pagamento de exemplo criado: DEMO-PIX-001 (R$ ${amount.toFixed(2)})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
