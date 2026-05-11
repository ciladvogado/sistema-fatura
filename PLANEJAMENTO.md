# PLANEJAMENTO FINAL: Sistema de Controle de Faturas

> Documento revisado refletindo a **versão efetivamente implementada** do sistema.
> Última atualização: 2026-05-11

---

## 1. CONTEXTO E OBJETIVO

**Sistema:** Controle interno de custo de terceirização para escritório contábil.

**Semântica do domínio:**

| Conceito | Definição |
|----------|-----------|
| **Fatura** | Documento interno: "Prestador X realizou Serviço Y para Cliente Z, custando R$ V" |
| **Pagamento** | Quando o escritório paga o prestador (1 pagamento pode quitar N faturas) |
| **Cliente** | Cliente do escritório (recebe o serviço terceirizado) |
| **Prestador** | Quem o escritório contrata para realizar o trabalho |
| **Escritório** | Filial/empresa dentro do sistema (multi-tenancy) |

**Fluxo principal:**
1. Cadastrar prestadores e seus serviços
2. Cadastrar clientes
3. Criar faturas registrando "Prestador X fez Serviço Y para Cliente Z"
4. Quando pagar o prestador, registrar 1 pagamento alocando o valor em múltiplas faturas
5. Sistema atualiza automaticamente status, paid_amount e remaining_amount

---

## 2. STACK TÉCNICO IMPLEMENTADA

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Framework** | Next.js (App Router + Turbopack) | 16.2.6 |
| **Linguagem** | TypeScript | 5.x |
| **UI** | React | 19.2.4 |
| **Styling** | Tailwind CSS | 4.x |
| **Form** | React Hook Form + Zod | 7.4 / 3.22 |
| **Auth** | NextAuth.js (Auth.js) | 5.0.0-beta.31 |
| **ORM** | Prisma | 5.22 |
| **Database** | PostgreSQL (Docker) | 15 |
| **Logging** | Pino + pino-pretty | 8 / 10 |
| **Icons** | Lucide React | 0.400+ |
| **Hash** | bcryptjs | 2.4 |
| **Email** | Resend (instalado, não usado ainda) | 3 |

**Ambiente de desenvolvimento:**
- Container PostgreSQL: `postgres-faturas` (porta 5432)
- Conexão via `127.0.0.1` (IPv4 forçado para compatibilidade)
- DATABASE_URL em `.env` (lido por Prisma) e `.env.local` (lido por Next.js)

---

## 3. ESTRUTURA DE PASTAS (REAL)

```
sistema-faturas/
├── prisma/
│   ├── schema.prisma           # 11 models, 6 enums
│   ├── seed.ts                 # Seed básico (1 escritório, 2 users)
│   ├── seed-demo.ts            # Dados de demonstração (clientes, faturas)
│   └── seed-payment.ts         # Pagamento de exemplo
├── src/
│   ├── actions/                # Server Actions
│   │   ├── audit.ts            # Exclusão de logs antigos
│   │   ├── bank-accounts.ts    # CRUD contas bancárias
│   │   ├── bulk-invoice-creation.ts  # Wizard de geração em lote
│   │   ├── clients.ts          # CRUD clientes
│   │   ├── invoices.ts         # CRUD faturas + marcação de vencidas
│   │   ├── offices.ts          # CRUD escritórios
│   │   ├── payments.ts         # CRUD pagamentos com alocação M:M
│   │   ├── service-providers.ts # CRUD prestadores
│   │   └── services.ts         # CRUD serviços
│   ├── app/
│   │   ├── (app)/              # Route group autenticado
│   │   │   ├── layout.tsx      # Sidebar + Navbar
│   │   │   ├── audit-logs/page.tsx
│   │   │   ├── bank-accounts/{page, new, [id]}.tsx
│   │   │   ├── clients/{page, new, [id]}.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── wizard/page.tsx  # Geração em lote
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── offices/{page, new, [id]}.tsx
│   │   │   ├── payments/{page, new, [id]}.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── service-providers/{page, new, [id]}.tsx
│   │   │   ├── services/{page, new, [id]}.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── auth/login/page.tsx
│   │   ├── unauthorized/page.tsx
│   │   ├── layout.tsx          # RootLayout
│   │   └── page.tsx            # Redirect raiz
│   ├── components/
│   │   ├── features/           # Componentes de domínio
│   │   │   ├── BankAccountForm.tsx
│   │   │   ├── ClientForm.tsx
│   │   │   ├── DeleteButton.tsx        # Reutilizável
│   │   │   ├── DeleteOldLogsButton.tsx
│   │   │   ├── InvoiceForm.tsx         # Com items dinâmicos
│   │   │   ├── InvoiceWizard.tsx       # Wizard 3 passos
│   │   │   ├── OfficeForm.tsx
│   │   │   ├── PaymentForm.tsx         # Com alocação M:M
│   │   │   ├── ServiceForm.tsx
│   │   │   └── ServiceProviderForm.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx     # Navegação lateral com RBAC
│   │   │   └── Navbar.tsx      # Avatar + logout
│   │   └── ui/                 # Design system
│   │       ├── Alert.tsx       # 4 variantes
│   │       ├── Button.tsx      # 5 variantes × 3 tamanhos
│   │       ├── Card.tsx        # + PageHeader, Badge
│   │       ├── Input.tsx       # + Textarea, Select, Checkbox
│   │       └── Table.tsx       # + EmptyState
│   ├── lib/
│   │   ├── audit.ts            # Helper auditLog()
│   │   ├── auth.ts             # NextAuth v5 config
│   │   ├── auth-utils.ts       # requireAuth(), requireRole()
│   │   ├── logger.ts           # Pino estruturado
│   │   ├── prisma.ts           # Singleton do client
│   │   └── utils.ts            # cn, formatCurrency, formatCnpjCpf, etc.
│   ├── schemas/                # Validação Zod
│   │   ├── bank-account.ts
│   │   ├── client.ts
│   │   ├── invoice.ts          # + calculateInvoiceTotals()
│   │   ├── office.ts
│   │   ├── payment.ts          # + allocations
│   │   ├── service-provider.ts
│   │   └── service.ts
│   ├── types/index.ts          # ActionResult<T>
│   └── middleware.ts           # RBAC
├── .env                        # DATABASE_URL (Prisma CLI)
├── .env.local                  # NEXTAUTH_SECRET, etc.
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js           # Sintaxe Tailwind v4
├── package.json
├── PROGRESSO.md                # Resumo do que foi entregue
└── PLANEJAMENTO.md             # Este documento
```

---

## 4. SCHEMA DO BANCO DE DADOS (IMPLEMENTADO)

### 4.1 Enums

```typescript
InvoiceStatus  = draft | issued | sent | partially_paid | paid | overdue | cancelled
PaymentStatus  = pending | processing | completed | failed | refunded | reversed
PaymentMethod  = bank_transfer | credit_card | debit_card | pix | check | cash | other
ClientStatus   = active | inactive | suspended
UserRole       = ADMIN | USER_PADRAO
AuditAction    = login | logout | create | update | delete | status_change | payment_recorded
```

### 4.2 Models

| Model | Função | Relacionamentos-chave |
|-------|--------|---------------------|
| **Office** | Escritório/filial | 1:N → BankAccount, ServiceProvider, Client, Invoice, User, AuditLog |
| **User** | Usuário do sistema | N:1 → Office; 1:N → AuditLog |
| **BankAccount** | Conta bancária do escritório | N:1 → Office; 1:N → Payment |
| **ServiceProvider** | Prestador terceirizado | N:1 → Office; 1:N → Service, Invoice, Payment |
| **Service** | Catálogo de serviços | N:1 → ServiceProvider; 1:N → InvoiceItem |
| **Client** | Cliente do escritório | N:1 → Office; 1:N → Invoice |
| **Invoice** | Fatura interna | N:1 → Office, Client, ServiceProvider; 1:N → InvoiceItem, PaymentInvoice |
| **InvoiceItem** | Item da fatura | N:1 → Invoice, Service |
| **Payment** | Pagamento a prestador | N:1 → ServiceProvider, BankAccount; 1:N → PaymentInvoice |
| **PaymentInvoice** ⭐ | **Alocação M:M** | N:1 → Payment, Invoice |
| **AuditLog** | Trilha de auditoria | N:1 → Office, User |

### 4.3 Validações de unicidade implementadas

- `Office.name` único globalmente
- `Office.email` único globalmente
- `Office.cnpj` único globalmente (opcional)
- `BankAccount.pixKey` único globalmente (opcional)
- `ServiceProvider`: (officeId, cnpjCpf) único
- `Service`: (serviceProviderId, serviceCode) único (opcional)
- `Client`: (officeId, cnpjCpf) único
- `Invoice`: (officeId, invoiceNumber) único
- `Invoice`: (clientId, competencyMonth, competencyYear, serviceProviderId) único
- `Payment.paymentReference` único globalmente
- `PaymentInvoice`: (paymentId, invoiceId) único

### 4.4 Regras de negócio implementadas

- **Quantidade máxima por item de fatura:** 50
- **Serviço sem quantidade:** força `quantity = 1` no form
- **isDefault em BankAccount:** atualização atômica garante 1 só padrão por escritório (transação)
- **Pagamento M:N:** soma das alocações **deve igualar** o valor do pagamento
- **Status automático da fatura:**
  - `paidAmount = 0` → mantém status
  - `0 < paidAmount < totalAmount` → `partially_paid`
  - `paidAmount >= totalAmount` → `paid`
  - `cancelled` nunca é alterado automaticamente
- **Marcação de vencidas:** ao listar `/invoices` ou `/dashboard`, faturas com `dueDate < hoje` e saldo > 0 viram `overdue`
- **Estorno de pagamento:** reverte `paidAmount`, `remainingAmount` e status de cada fatura aliada
- **Fatura com pagamento:** não pode ser editada nem excluída (precisa estornar antes)

---

## 5. MÓDULOS — STATUS FINAL

### 5.1 FASE 1: Setup & Autenticação ✅

| Item | Status |
|------|--------|
| Next.js 16 + TypeScript + Tailwind v4 | ✅ |
| PostgreSQL via Docker | ✅ |
| Prisma + migrations (db push) | ✅ |
| NextAuth v5 beta com Credentials | ✅ |
| Tela de login com 2 botões demo | ✅ |
| Middleware RBAC | ✅ |
| Layout protegido (Sidebar + Navbar) | ✅ |
| Auditoria login/logout (IP) | ✅ |
| Página `/unauthorized` | ✅ |
| Recuperação de senha por e-mail | ❌ Não implementado (precisa configurar Resend) |

### 5.2 FASE 2: Cadastros Básicos ✅

Todos os 5 módulos com **CRUD completo**, validações Zod no servidor, auditoria, exclusão lógica conforme aplicável.

| Módulo | RBAC | Validações específicas |
|--------|------|----------------------|
| **Escritórios** | Admin | nome/email/CNPJ únicos; admin não pode excluir o próprio |
| **Contas Bancárias** | Admin | PIX único; isDefault transacional |
| **Prestadores** | Admin | CNPJ/CPF único por escritório; prazo pgto + desconto padrão |
| **Serviços** | Admin | código único por prestador; flag containsQuantity |
| **Clientes** | Todos | CNPJ/CPF único por escritório; status; endereços cobrança/envio; crédito |

### 5.3 FASE 3: Faturas & Pagamentos ✅

**Faturas:**
- Form com itens dinâmicos (adicionar/remover linhas)
- Auto-preenchimento ao selecionar serviço (nome, preço, quantidade fixa se aplicável)
- Cálculo em tempo real: subtotal, desconto (R$ e %), impostos, total
- ISS por item (taxPercent)
- Chave única composta: cliente + competência + prestador
- Status manual + automático
- Edição bloqueada se houver pagamento
- Exclusão bloqueada se houver pagamento (estornar antes)

**Pagamentos com alocação M:M:**
- Fluxo: selecionar prestador → carrega faturas em aberto dinamicamente
- Distribuição automática proporcional
- Quitação rápida por fatura
- Validação: soma das alocações = valor do pagamento (tolerância 0.01)
- Validação: alocação não pode exceder saldo da fatura
- Transação atômica: cria Payment + PaymentInvoice[] + atualiza N invoices
- Estorno reverte tudo

**Página de detalhe do pagamento:**
- 3 cards (valor, método, data)
- Tabela com todas as faturas pagas pelo lançamento

### 5.4 FASE 4: Wizard de Geração em Lote ✅

Wizard de 3 passos:
1. **Competência + prestador** (mês, ano, datas, prestador)
2. **Serviço + clientes** (lista com checkbox, selecionar todos)
3. **Grid de quantidades** (linha por cliente, qty editável, preço ajustável, totais)

Comportamento:
- Se serviço **não usa quantidade**: campo desabilitado, fixado em 1
- Linhas com qty = 0 são ignoradas
- Faturas duplicadas (mesma competência) são puladas, contadas em "skipped"
- Numeração automática: `{ano}-{mês}-{seq}`
- Status inicial: `issued`

### 5.5 FASE 5: Dashboard, Relatórios e Settings ✅

**Dashboard avançado:**
- Filtros por período (30/60/90/180/365 dias) e prestador
- 4 cards de métricas clicáveis (Faturas, Pagamentos, Clientes, Prestadores)
- 3 cards de valores (Custo total, Em aberto, Já pago)
- Top 5 prestadores em aberto
- 4 pagamentos mais recentes
- Lista de faturas vencidas com destaque

**Relatórios:**
- Distribuição de faturas por status (com totais)
- Top 20 clientes por custo
- Top 20 prestadores por custo
- Evolução mensal (últimos 12 meses) via SQL raw

**Settings (Admin):**
- Info do escritório atual
- Estatísticas globais
- Armazenamento de logs (registros, tamanho em MB)
- Link rápido para Audit Logs

### 5.6 FASE 6: Auditoria ✅

- Página `/audit-logs` (Admin)
- Mostra os 200 logs mais recentes
- Filtros: ação, entidade, usuário
- Métricas de armazenamento: total de registros, tamanho em MB, KB/registro, registro mais antigo
- **Exclusão de logs antigos**: admin escolhe data de corte, sistema deleta e audita a própria exclusão
- Auditoria automática em:
  - Login / Logout (com IP)
  - CRUD de todas as 9 entidades
  - Mudança de status de fatura
  - Registro/estorno de pagamento
  - Geração em lote (1 log por execução)

---

## 6. CREDENCIAIS E DADOS DE DEMO

### 6.1 Login

| Tipo | Email | Senha |
|------|-------|-------|
| Admin | admin@escritorio.com.br | admin123456 |
| Usuário Padrão | usuario@escritorio.com.br | user123456 |

### 6.2 Dados pré-populados

- 1 Escritório (Matriz São Paulo)
- 1 Conta Bancária
- 3 Prestadores (originaldemo + Tech Solutions + Maria Consultoria)
- 6 Serviços
- 5 Clientes (originaldemo + Padaria São José + Auto Peças + Restaurante + Construtora)
- ~8 Faturas em status variados
- 1 Pagamento de exemplo (DEMO-PIX-001)

---

## 7. ROTAS DO SISTEMA

| Rota | Acesso | Função |
|------|--------|--------|
| `/` | Público | Redirect inteligente |
| `/auth/login` | Público | Login |
| `/unauthorized` | Logado | Acesso negado |
| `/dashboard` | Logado | Dashboard com filtros |
| `/invoices` | Logado | Listagem de faturas |
| `/invoices/new` | Logado | Nova fatura |
| `/invoices/[id]` | Logado | Editar fatura |
| `/invoices/wizard` | Logado | Geração em lote |
| `/payments` | Logado | Listagem de pagamentos |
| `/payments/new` | Logado | Novo pagamento |
| `/payments/[id]` | Logado | Detalhe do pagamento |
| `/clients` | Logado | Listagem de clientes |
| `/clients/new` | Logado | Novo cliente |
| `/clients/[id]` | Logado | Editar cliente |
| `/reports` | Logado | Relatórios |
| `/service-providers` | Admin | Listagem de prestadores |
| `/service-providers/new` | Admin | Novo prestador |
| `/service-providers/[id]` | Admin | Editar prestador |
| `/services` | Admin | Listagem de serviços |
| `/services/new` | Admin | Novo serviço |
| `/services/[id]` | Admin | Editar serviço |
| `/bank-accounts` | Admin | Listagem de contas |
| `/bank-accounts/new` | Admin | Nova conta |
| `/bank-accounts/[id]` | Admin | Editar conta |
| `/offices` | Admin | Listagem de escritórios |
| `/offices/new` | Admin | Novo escritório |
| `/offices/[id]` | Admin | Editar escritório |
| `/audit-logs` | Admin | Trilha de auditoria |
| `/settings` | Admin | Configurações |

**Total: 28 rotas** (incluindo login e unauthorized)

---

## 8. DECISÕES TÉCNICAS E DESVIOS DO PLANO ORIGINAL

| Decisão original | O que foi feito | Motivo |
|-----------------|-----------------|--------|
| Next.js 14 | **Next.js 16** | `create-next-app` instalou a versão mais recente |
| NextAuth v5 | **NextAuth 5.0.0-beta.31** | v5 ainda em beta |
| Prisma 7 (com prisma.config.ts) | **Prisma 5.22** | v7 tem incompatibilidades; reverteu para v5 com `url` em schema.prisma |
| `/app/` na raiz (de `create-next-app`) | **Removido**, usado `/src/app/` | Conflito de prioridade — `/app/` da raiz sobrescrevia `/src/app/` |
| Tailwind v3 syntax | **Tailwind v4 syntax** (`@import "tailwindcss"`) | Versão instalada é v4 |
| Route groups `(auth)` e `(dashboard)` | **`(app)`** (autenticadas) e `auth/` direta | Simplificação; `auth/` direto evita complicações com NextAuth interceptando rotas `(auth)/` |
| Recuperação de senha via e-mail | **Não implementado** | Precisa configurar Resend; deixado para versão futura |
| PDFs de relatórios | **HTML em vez de PDF** | jsPDF não instalado; relatórios estão como tabelas web |
| Dashboard configurável por Admin | **Settings somente leitura** | Versão simplificada; Admin vê estatísticas mas não customiza dashboard |

---

## 9. ESTADO DE CONFORMIDADE COM CHECKLIST ORIGINAL

### Backend
- [x] Prisma migrations (schema completo) — via `db push`
- [x] Lógica de auditoria e atualizações automáticas — em Server Actions
- [x] Server Actions: autenticação, clientes, faturas, pagamentos
- [x] API routes: NextAuth handler
- [x] Validações Zod: todos os schemas
- [x] Logging com Pino + AuditLog table
- [ ] Recovery de senha com Resend — pendente
- [x] Tratamento de erros global — via ActionResult

### Frontend
- [x] Layout base (Navbar, Sidebar, content area)
- [x] Tela de Login com botões de usuários
- [x] Middleware RBAC
- [x] Componentes UI base (Button, Modal *, Form, Table)  
      _* Modal não foi criado isoladamente; usa Card como contêiner_
- [x] Páginas de cadastro (6 módulos) — _na verdade 5: Escritórios, Bancos, Prestadores, Serviços, Clientes_
- [x] Página de faturas (CRUD + listagem)
- [x] Página de pagamentos (registrar)
- [x] Assistente de geração em lote
- [x] Dashboard com filtros
- [x] Página de relatórios
- [x] Página de audit logs
- [x] Página settings (Admin)

### Testes & Validação
- [x] Seed com dados demo (3 scripts: básico, demo, payment)
- [x] Validação automatizada: 19 rotas retornam HTTP 200
- [x] Validações de negócio (chave única, quantidade máx, etc.)
- [x] Fluxo do assistente (ambas opções: com e sem quantidade)
- [x] Dashboard renderiza corretamente
- [x] Filtros funcionam
- [x] Auditoria registra todas as ações
- [ ] Recovery de senha funciona — pendente
- [x] Permissões RBAC funcionam

### Deploy
- [ ] Build Next.js sem erros — não verificado em produção
- [ ] Push para Vercel — não realizado
- [ ] Variáveis de env em produção — não configuradas
- [ ] Funciona em produção — não testado

---

## 10. PRÓXIMOS PASSOS (PÓS-VERSÃO ATUAL)

### Curto prazo (melhorias rápidas)
1. **Recuperação de senha** via Resend
2. **Confirmação por modal** mais bonita (substituir `confirm()` nativo)
3. **Toast/notificações** após salvar (substituir alerts)
4. **Paginação** nas tabelas de listagem (atualmente carregam tudo)
5. **Busca/filtro** nas listagens (faturas, clientes, etc.)
6. **Renomear `middleware.ts` → `proxy.ts`** (Next.js 16 está depreciando)

### Médio prazo (features adicionais)
1. **Relatórios em PDF** com jsPDF/react-pdf
2. **Exportação CSV/Excel** das listagens
3. **Gráficos** no dashboard (chart.js ou recharts)
4. **Notificações de faturas vencidas** por e-mail
5. **Dark mode**
6. **Mobile-first**: otimizar sidebar para mobile

### Longo prazo (evoluções estruturais)
1. **Multi-escritório real**: usuário com acesso a vários escritórios
2. **Permissões granulares** além de Admin/Padrão
3. **Integração com APIs bancárias** (reconciliação automática)
4. **API pública** para integrações externas
5. **Testes automatizados** (Vitest/Playwright)
6. **CI/CD** com GitHub Actions

### Deploy para produção
1. Provisionar PostgreSQL gerenciado (Neon, Supabase, ou Vercel Postgres)
2. Configurar variáveis de ambiente na Vercel
3. `vercel --prod`
4. Configurar domínio próprio
5. Configurar Resend para e-mails

---

## 11. COMO RODAR O PROJETO

```bash
# 1. Subir PostgreSQL no Docker (já configurado)
docker start postgres-faturas

# 2. Instalar dependências (já feito)
npm install --legacy-peer-deps

# 3. Gerar Prisma Client
npx prisma generate

# 4. Sincronizar schema (já feito)
npx prisma db push

# 5. Popular dados demo (já feito)
npx prisma db seed
DATABASE_URL="postgresql://postgres:senha123@127.0.0.1:5432/sistema_faturas" npx tsx prisma/seed-demo.ts
DATABASE_URL="postgresql://postgres:senha123@127.0.0.1:5432/sistema_faturas" npx tsx prisma/seed-payment.ts

# 6. Iniciar dev server
npm run dev

# 7. Abrir http://localhost:3000
```

---

## 12. RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Fases concluídas** | 6 de 6 (100%) |
| **Models do banco** | 11 |
| **Enums** | 6 |
| **Server Actions** | 9 arquivos, ~30 funções |
| **Schemas Zod** | 7 |
| **Componentes UI base** | 5 (Button, Input/Select/Textarea/Checkbox, Table, Card, Alert) |
| **Componentes de feature** | 10 (forms + botões especializados) |
| **Páginas do app** | 28 rotas |
| **Validação E2E** | 19/19 rotas HTTP 200 |
| **Erros no log** | 0 |

**Status:** ✅ MVP funcional, pronto para uso interno e iteração.

---

_Documento gerado em 11/05/2026, refletindo o estado real do código no momento da entrega._
