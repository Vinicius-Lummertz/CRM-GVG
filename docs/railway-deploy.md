# Deploy da API no Railway (com Supabase)

## 1) Pré-requisitos
- Repositório já conectado no Railway.
- Projeto Supabase criado.
- String de conexão Postgres do Supabase (`DATABASE_URL`).

> Importante: `SUPABASE_PROJECT_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPBASE_SECRET_KEY` foram mantidas como secrets de ambiente, mas para esta API funcionar com o banco relacional atual você também precisa da `DATABASE_URL`.

## 2) Configurar variáveis no Railway
No serviço da API (`Variables`), adicione:

- `PORT` = `3000` (opcional, Railway costuma injetar automaticamente)
- `PUBLIC_BASE_URL` = URL pública da app no Railway
- `SUPABASE_PROJECT_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPBASE_SECRET_KEY`
- `DATABASE_URL` = conexão Postgres do Supabase
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
3. Você deve ver no log: `"[db] Postgres/Supabase inicializado"`.
4. Teste endpoint de health da API (ex: `/api/health`).

## 5) Troubleshooting rápido
- **Erro de conexão no banco:** revise `DATABASE_URL`.
- **Erro de auth/forbidden no banco:** confirme se a URL é de conexão Postgres e não URL REST.
- **Webhook externo falhando:** revise `PUBLIC_BASE_URL` e secrets Twilio.
