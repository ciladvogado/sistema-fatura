import { PrismaClient } from "@prisma/client"
import bcryptjs from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...")

  // Limpar dados anteriores
  await prisma.auditLog.deleteMany()
  await prisma.paymentInvoice.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.service.deleteMany()
  await prisma.serviceProvider.deleteMany()
  await prisma.client.deleteMany()
  await prisma.bankAccount.deleteMany()
  await prisma.user.deleteMany()
  await prisma.office.deleteMany()

  console.log("✅ Dados anteriores deletados")

  // Criar filial
  const office = await prisma.office.create({
    data: {
      name: "Matriz São Paulo",
      cnpj: "12.345.678/0001-99",
      email: "matriz@escritorio.com.br",
      phone: "11 3000-0000",
      addressCity: "São Paulo",
      addressState: "SP",
      isActive: true,
    },
  })

  console.log("✅ Filial criada: ", office.name)

  // Criar usuários
  const adminPassword = await bcryptjs.hash("admin123456", 12)
  const userPassword = await bcryptjs.hash("user123456", 12)

  const admin = await prisma.user.create({
    data: {
      email: "admin@escritorio.com.br",
      name: "Administrador",
      password: adminPassword,
      role: "ADMIN",
      officeId: office.id,
    },
  })

  const user = await prisma.user.create({
    data: {
      email: "usuario@escritorio.com.br",
      name: "Usuário Padrão",
      password: userPassword,
      role: "USER_PADRAO",
      officeId: office.id,
    },
  })

  console.log("✅ Usuários criados:")
  console.log(`   - ${admin.name} (${admin.email}) - Senha: admin123456`)
  console.log(`   - ${user.name} (${user.email}) - Senha: user123456`)

  // Criar conta bancária
  const bankAccount = await prisma.bankAccount.create({
    data: {
      officeId: office.id,
      bankName: "Banco do Brasil",
      bankCode: "001",
      agencyNumber: "0001",
      accountNumber: "123456-7",
      accountType: "checking",
      accountHolder: "Escritório Contábil XYZ",
      pixKey: "contabilidade@escritorio.com.br",
      pixKeyType: "email",
      isActive: true,
      isDefault: true,
    },
  })

  console.log("✅ Conta bancária criada")

  // Criar prestador de serviço
  const provider = await prisma.serviceProvider.create({
    data: {
      officeId: office.id,
      name: "Consultoria e Assessoria Ltda",
      cnpjCpf: "98.765.432/0001-11",
      email: "contato@consultoria.com.br",
      phone: "11 3000-1111",
      paymentTermsDays: 30,
      isActive: true,
    },
  })

  console.log("✅ Prestador de serviço criado")

  // Criar serviço SEM quantidade
  const serviceNoQty = await prisma.service.create({
    data: {
      serviceProviderId: provider.id,
      name: "Consultoria Estratégica Mensal",
      description: "Consultoria estratégica com atendimento mensal",
      serviceCode: "CONS-001",
      basePrice: 5000,
      unitType: "month",
      containsQuantity: false,
      isActive: true,
    },
  })

  // Criar serviço COM quantidade
  const serviceWithQty = await prisma.service.create({
    data: {
      serviceProviderId: provider.id,
      name: "Assessoria por Hora",
      description: "Assessoria cobrada por hora",
      serviceCode: "ASSE-001",
      basePrice: 150,
      unitType: "hour",
      containsQuantity: true,
      isActive: true,
    },
  })

  console.log("✅ Serviços criados")

  // Criar cliente
  const client = await prisma.client.create({
    data: {
      officeId: office.id,
      name: "Empresa ABC Ltda",
      cnpjCpf: "11.222.333/0001-44",
      email: "contato@empresaabc.com.br",
      phone: "11 4000-2222",
      billingCity: "Rio de Janeiro",
      billingState: "RJ",
      paymentTermsDays: 30,
      status: "active",
      isActive: true,
    },
  })

  console.log("✅ Cliente criado")

  console.log("\n✨ Seed concluído com sucesso!")
  console.log("\n📝 Dados para teste:")
  console.log("  Email Admin: admin@escritorio.com.br")
  console.log("  Senha Admin: admin123456")
  console.log("  Email User: usuario@escritorio.com.br")
  console.log("  Senha User: user123456")
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
