# Sistema de Faturas — Controle de Terceirização

Sistema interno para escritório contábil gerenciar custos de prestadores terceirizados, faturas e pagamentos.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

---

## 📖 Sobre

Controle interno de **custo de terceirização** para escritórios contábeis. Registre serviços prestados por terceiros aos seus clientes, controle quanto você deve pagar a cada prestador, e registre pagamentos que podem quitar **múltiplas faturas de uma vez**.

### Semântica do domínio

| Conceito | Significado |
|----------|-------------|
| **Escritório** | Sua filial/empresa (suporte a multi-tenancy) |
| **Cliente** | Cliente do seu escritório (destinatário do serviço) |
| **Prestador** | Quem você terceiriza para executar serviços |
| **Serviço** | Catálogo do que cada prestador oferece |
| **Fatura** | "Prestador X fez Serviço Y para Cliente Z, custou R$ V" |
| **Pagamento** | Quando você paga o prestador (quita N faturas) |

---

## ✨ Funcionalidades

### Cadastros básicos
- 🏢 **Escritórios** com endereço completo e CNPJ
- 💳 **Contas bancárias** com PIX e conta padrão por escritório
- 👔 **Prestadores** com CNPJ/CPF, prazo de pagamento e desconto padrão
- 🔧 **Serviços** com preço base, unidade e flag "usa quantidade"
- 👥 **Clientes** com endereços de cobrança/envio separados e limite de crédito

### Faturamento
- 📝 **Faturas** com itens dinâmicos, descontos (R$ e %), impostos, ISS por item
- 🧙 **Wizard de geração em lote**: assistente de 3 passos para criar várias faturas
- 🔄 Cálculo automático de subtotal, totais e status
- 📅 Validação de competência única por cliente/prestador
- ⏰ Marcação automática de faturas vencidas

### Pagamentos
- 💰 **Alocação M:M**: 1 pagamento pode quitar múltiplas faturas
- 🎯 Distribuição automática proporcional ao saldo
- ✅ Validação: soma das alocações = valor do pagamento
- 🔁 **Estorno** reverte valores e status em todas as faturas afetadas
- 🏦 Suporte a PIX, TED/DOC, cartão, cheque, dinheiro

### Dashboard e relatórios
- 📊 **Dashboard com filtros** por período (30/60/90/180/365 dias) e prestador
- 💼 Métricas: faturas, pagamentos, clientes/prestadores ativos
- 💸 Cards de custo total, em aberto e já pago
- 🏆 Top 5 prestadores em aberto
- 📈 **Relatórios**: distribuição por status, top 20 clientes/prestadores, evolução mensal

### Segurança e governança
- 🔐 Autenticação com **NextAuth v5** (JWT, sessão segura)
- 👮 **RBAC** (Admin e Usuário Padrão) via middleware
- 📜 **Auditoria automática** de toda operação CRUD, login/logout, mudanças de status
- 🗑️ Gestão de armazenamento de logs: ver tamanho em MB e limpar logs antigos
- 🛡️ Validação dupla: client-side (HTML5) + server-side (Zod)

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Next.js 16 (App Router + Turbopack) |
| **Linguagem** | TypeScript |
| **UI** | React 19 + Tailwind CSS v4 + Lucide Icons |
| **Forms** | React Hook Form + Zod |
| **Auth** | NextAuth.js v5 (beta) |
| **ORM** | Prisma 5 |
| **Database** | PostgreSQL 15 (via Docker) |
| **Logging** | Pino + pino-pretty |

---

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 20+
- Docker Desktop (para PostgreSQL)
- npm ou pnpm

### Passos

```bash
# 1. Clonar o repositório
git clone https://github.com/ciladvogado/sistema-fatura.git
cd sistema-fatura

# 2. Instalar dependências
npm install --legacy-peer-deps

# 3. Subir PostgreSQL no Docker
docker run -d \
  --name postgres-faturas \
  -e POSTGRES_PASSWORD=senha123 \
  -e POSTGRES_DB=sistema_faturas \
  -p 5432:5432 \
  postgres:15

# 4. Criar arquivo .env na raiz
echo 'DATABASE_URL="postgresql://postgres:senha123@127.0.0.1:5432/sistema_faturas"' > .env

# 5. Criar arquivo .env.local
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:senha123@127.0.0.1:5432/sistema_faturas"
NEXTAUTH_SECRET="seu-secret-aqui-pelo-menos-32-chars"
AUTH_SECRET="seu-secret-aqui-pelo-menos-32-chars"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
EOF

# 6. Gerar Prisma Client e sincronizar schema
npx prisma generate
npx prisma db push

# 7. Popular o banco com dados demo
npx prisma db seed

# 8. Iniciar o servidor
npm run dev
```

Acesse **http://localhost:3000** e faça login com:

| Usuário | Email | Senha |
|---------|-------|-------|
| 👑 Admin | `admin@escritorio.com.br` | `admin123456` |
| 👤 Usuário Padrão | `usuario@escritorio.com.br` | `user123456` |

---

## 📁 Estrutura do projeto

```
src/
├── actions/          # Server Actions (CRUDs + transações)
├── app/
│   ├── (app)/        # Rotas autenticadas com layout
│   ├── api/auth/     # NextAuth handler
│   ├── auth/login/   # Tela de login
│   └── unauthorized/ # Página de acesso negado
├── components/
│   ├── features/     # Forms e componentes de domínio
│   ├── layout/       # Sidebar e Navbar
│   └── ui/           # Design system (Button, Input, Table, Card...)
├── lib/              # Utilitários (audit, auth, logger, prisma, utils)
├── schemas/          # Validação Zod por entidade
├── types/            # Tipos compartilhados
└── middleware.ts     # RBAC

prisma/
├── schema.prisma     # 11 models + 6 enums
├── seed.ts           # Dados iniciais
├── seed-demo.ts      # Cadastros e faturas variadas
└── seed-payment.ts   # Pagamento de exemplo
```

---

## 📚 Documentação

- **[PLANEJAMENTO.md](./PLANEJAMENTO.md)** — Planejamento completo, decisões técnicas e próximos passos
- **[PROGRESSO.md](./PROGRESSO.md)** — Resumo do que foi entregue, fase a fase

---

## 🗺️ Roadmap

### Concluído ✅
- [x] Autenticação + RBAC
- [x] CRUD dos 5 cadastros básicos
- [x] Faturas com itens dinâmicos
- [x] Pagamentos com alocação M:M
- [x] Wizard de geração em lote
- [x] Dashboard com filtros
- [x] Relatórios
- [x] Auditoria com gestão de armazenamento

### Próximos passos 🔮
- [ ] Recuperação de senha via e-mail (Resend)
- [ ] Toast/notificações no lugar de `alert()`
- [ ] Paginação e busca nas listagens
- [ ] Relatórios em PDF (jsPDF)
- [ ] Gráficos (Recharts)
- [ ] Exportação CSV/Excel
- [ ] Dark mode
- [ ] Deploy na Vercel
- [ ] Testes automatizados (Vitest + Playwright)

---

## 📊 Modelo de dados

```
Office (escritório/filial)
  ├── User (usuários com role: ADMIN | USER_PADRAO)
  ├── BankAccount (contas bancárias)
  ├── ServiceProvider (prestadores terceirizados)
  │   ├── Service (catálogo)
  │   └── Payment (pagamentos)
  │       └── PaymentInvoice (alocação M:M)  ⭐
  ├── Client (clientes do escritório)
  │   └── Invoice (faturas)
  │       ├── InvoiceItem (itens)
  │       └── PaymentInvoice (alocação M:M)  ⭐
  └── AuditLog (trilha de auditoria)
```

A tabela **`PaymentInvoice`** é o coração do modelo: permite que **1 pagamento** ao prestador quite **N faturas** de uma vez (cenário comum no fim do mês).

---

## 🤝 Contribuindo

Este é um projeto interno em desenvolvimento. Sugestões e melhorias são bem-vindas via issues.

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.
