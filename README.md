# Komplexa Forms

App standalone de **formulários interativos** (typeform-like) extraído da plataforma Komplexa.
Crie formulários por slug, compartilhe o link público, e capte respostas com tracking
completo de atribuição (UTM + fbclid + gclid) e analytics de conversão por anúncio.

Esta versão é **self-contained**: não tem acoplamento com o CRM. Ao submeter, o form
apenas **salva a resposta** (não cria lead/company/contact). O nome de exibição é derivado
automaticamente dos campos mapeados (`company_name` / `contact_name`).

## Funcionalidades

- **Form público** (`/f/:slug`): uma pergunta por tela, animações, 6 layouts de capa
  (minimal, hero image/video, social proof, depoimento, quiz/stats) + modo "sem capa"
  (estilo Respondi, abre direto na 1ª pergunta).
- **Tipos de campo**: texto, texto longo, e-mail, telefone, CPF, CNPJ, número, moeda (R$),
  seleção única/múltipla, slider, sim/não, agendamento, upload de arquivo.
- **Tracking**: views, progressão por step, abandono (beacon), tempo por pergunta, erros
  de validação, captura parcial, honeypot + time-to-fill anti-bot.
- **Admin builder** (protegido por login): criar/editar/clonar forms, editor visual da LP,
  preview ao vivo, estatísticas (conversão, drop-off, origem de tráfego, top anúncios) e
  listagem/export CSV das respostas.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + React Query + React Router + Recharts + Framer Motion + Sonner
- **Backend:** Supabase (Postgres + Auth + RLS + Storage). Tudo via RPC `security definer`.
- **Deploy:** qualquer host de SPA estática (Vercel incluso, com rewrite SPA em `vercel.json`).

## Setup local

```bash
npm install
cp .env.example .env.local
# Cole VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do dashboard Supabase
npm run dev
```

## Backend (Supabase)

1. Crie um projeto **novo** no [Supabase](https://supabase.com).
2. No **SQL Editor**, rode a migration `supabase/migrations/0001_forms_standalone.sql`.
   Ela cria as tabelas (`forms`, `form_fields`, `form_submissions`, `form_views`,
   `form_partials`, `profiles`), os buckets de Storage (`form-uploads`, `form-assets`),
   o RLS e todas as RPCs.
3. Em **Authentication → Users**, crie um usuário (e-mail + senha) para acessar o admin.
   Um `profile` é criado automaticamente no primeiro cadastro.
4. Copie a **Project URL** e a **anon key** (Settings → API) para o `.env.local`.

## Como usar

1. Faça login em `/login` com o usuário criado no Supabase.
2. Em **Forms**, crie um formulário, adicione campos e personalize as telas.
3. Ative o form e compartilhe o link público `/f/<slug>`.
4. Acompanhe respostas e métricas em **Submissions** e **Stats**.

## Estrutura

```
src/
  pages/PublicForm.tsx            # form que o lead responde
  pages/admin/AdminForms.tsx      # lista + criação
  pages/admin/AdminFormEdit.tsx   # editor de campos + telas (LP)
  pages/admin/AdminFormStats.tsx  # métricas e conversão
  pages/admin/AdminFormSubmissions.tsx  # respostas + export CSV
  components/form/                # FormStepView, welcome-layouts, FormLPSection
  hooks/useForms.ts               # data layer (React Query)
  lib/formMasks.ts                # máscaras/validações BR
supabase/migrations/0001_forms_standalone.sql
```
