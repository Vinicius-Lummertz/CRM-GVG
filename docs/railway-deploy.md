# Deploy da API no Railway (com Supabase SDK)

## 1) Pré-requisitos
- Repositório já conectado no Railway.
- Projeto Supabase criado.
- Tabelas já criadas no Supabase (via SQL Editor/Migrations do Supabase).

> Importante: a API agora usa `@supabase/supabase-js` (HTTPS/porta 443), sem conexão direta PostgreSQL na porta 5432.

## 2) Configurar variáveis no Railway
No serviço da API (`Variables`), adicione:

- `PORT` = `3000` (opcional, Railway costuma injetar automaticamente)
- `PUBLIC_BASE_URL` = URL pública da app no Railway
- `SUPABASE_URL` (ou `SUPABASE_PROJECT_URL`)
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPBASE_SECRET_KEY` (ou `SUPABASE_SECRET_KEY`)
- Demais segredos que você já usa (Twilio/AI)

Use o arquivo `.env.example` como checklist.

## 3) Configuração de build/start
A API usa:
- Build: `npm install`
- Start: `npm start`

O `start` já sobe `server.js`, que inicializa a API em `server/`.

## 4) Primeiro deploy
1. Faça push para a branch conectada.
2. Abra o deploy no Railway e acompanhe logs.
3. Você deve ver no log: `"[db] Supabase SDK inicializado"`.
4. Teste endpoint de health da API (ex: `/api/health`).

## 5) Troubleshooting rápido
- **Erro de env obrigatória:** revise `SUPABASE_URL`/`SUPABASE_PROJECT_URL` e `SUPABASE_SECRET_KEY`/`SUPBASE_SECRET_KEY`.
- **Erro de permissão (`401/403`)**: confira a chave secreta de servidor.
- **Erro de tabela inexistente:** execute o DDL no SQL Editor do Supabase antes do deploy.
- **Webhook externo falhando:** revise `PUBLIC_BASE_URL` e secrets Twilio.
