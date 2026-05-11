import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Criando dados de demonstração adicionais...")

  // Pega o primeiro escritório e o prestador existente
  const office = await prisma.office.findFirst()
  if (!office) {
    console.error("❌ Nenhum escritório encontrado. Rode 'npx prisma db seed' antes.")
    return
  }

  const existingProvider = await prisma.serviceProvider.findFirst({
    where: { officeId: office.id },
  })

  // Cria mais 2 prestadores se ainda não houver muitos
  const providersCount = await prisma.serviceProvider.count({
    where: { officeId: office.id },
  })

  if (providersCount < 3) {
    const provider2 = await prisma.serviceProvider.create({
      data: {
        officeId: office.id,
        name: "Tech Solutions Ltda",
        cnpjCpf: "98765432000122",
        email: "contato@techsolutions.com.br",
        phone: "(11) 4002-8922",
        paymentTermsDays: 30,
        services: {
          create: [
            {
              name: "Suporte mensal",
              basePrice: 1500,
              containsQuantity: false,
              unitType: "mes",
            },
            {
              name: "Desenvolvimento sob demanda",
              basePrice: 180,
              containsQuantity: true,
              unitType: "hora",
            },
          ],
        },
      },
    })
    console.log(`✅ Prestador criado: ${provider2.name}`)

    const provider3 = await prisma.serviceProvider.create({
      data: {
        officeId: office.id,
        name: "Maria Consultoria ME",
        cnpjCpf: "11122233344",
        email: "maria@consultoria.com",
        phone: "(11) 99999-1234",
        paymentTermsDays: 15,
        services: {
          create: [
            {
              name: "Consultoria contábil",
              basePrice: 350,
              containsQuantity: true,
              unitType: "hora",
            },
            {
              name: "Honorários contábeis",
              basePrice: 900,
              containsQuantity: false,
              unitType: "mes",
            },
          ],
        },
      },
    })
    console.log(`✅ Prestador criado: ${provider3.name}`)
  }

  // Cria mais clientes
  const clientCount = await prisma.client.count({ where: { officeId: office.id } })

  if (clientCount < 5) {
    const clientsData = [
      {
        name: "Padaria São José Ltda",
        cnpjCpf: "12345678000199",
        email: "contato@padariasaojose.com.br",
        phone: "(11) 3322-4455",
      },
      {
        name: "Auto Peças Brasil",
        cnpjCpf: "98765432000188",
        email: "vendas@autopecasbrasil.com.br",
      },
      {
        name: "Restaurante Sabor & Cia",
        cnpjCpf: "55566677000122",
        email: "contato@saborecia.com.br",
      },
      {
        name: "Construtora Horizonte",
        cnpjCpf: "44455566000177",
        email: "obra@horizonte.com.br",
      },
    ]
    for (const data of clientsData) {
      const existing = await prisma.client.findFirst({
        where: { officeId: office.id, cnpjCpf: data.cnpjCpf },
      })
      if (!existing) {
        await prisma.client.create({
          data: { ...data, officeId: office.id, status: "active", isActive: true },
        })
        console.log(`✅ Cliente: ${data.name}`)
      }
    }
  }

  // Cria algumas faturas de exemplo
  const invoiceCount = await prisma.invoice.count({ where: { officeId: office.id } })

  if (invoiceCount < 5) {
    const clients = await prisma.client.findMany({
      where: { officeId: office.id, isActive: true },
      take: 4,
    })
    const providers = await prisma.serviceProvider.findMany({
      where: { officeId: office.id },
      include: { services: true },
      take: 3,
    })

    if (clients.length > 0 && providers.length > 0) {
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      let counter = 100
      for (const client of clients) {
        for (const provider of providers.slice(0, 2)) {
          const svc = provider.services[0]
          if (!svc) continue
          const month = Math.random() > 0.5 ? thisMonth : lastMonth
          const competencyMonth = month.getMonth() + 1
          const competencyYear = month.getFullYear()

          const exists = await prisma.invoice.findFirst({
            where: {
              clientId: client.id,
              serviceProviderId: provider.id,
              competencyMonth,
              competencyYear,
            },
          })
          if (exists) continue

          const qty = svc.containsQuantity ? Math.ceil(Math.random() * 5) : 1
          const total = qty * Number(svc.basePrice)
          const isPaid = Math.random() > 0.6

          await prisma.invoice.create({
            data: {
              officeId: office.id,
              clientId: client.id,
              serviceProviderId: provider.id,
              invoiceNumber: `INV-${competencyYear}-${counter++}`,
              competencyMonth,
              competencyYear,
              issueDate: month,
              dueDate: new Date(month.getTime() + 30 * 86400000),
              subtotal: total,
              discountAmount: 0,
              discountPercent: 0,
              taxAmount: 0,
              totalAmount: total,
              paidAmount: isPaid ? total : 0,
              remainingAmount: isPaid ? 0 : total,
              status: isPaid ? "paid" : "issued",
              items: {
                create: [
                  {
                    serviceId: svc.id,
                    description: svc.name,
                    quantity: qty,
                    unitPrice: svc.basePrice,
                    lineTotal: total,
                    taxPercent: 0,
                    taxAmount: 0,
                    lineOrder: 1,
                  },
                ],
              },
            },
          })
        }
      }
      console.log(`✅ Faturas de exemplo criadas`)
    }
  }

  console.log("\n✨ Dados de demonstração prontos!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
