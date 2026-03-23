# CRM-GVG

Backend em Node.js + Express com foco em APIs de CRM/WhatsApp.

## Estrutura

- `server/`: domínio, controllers, rotas, integrações e casos de uso do backend.
- `db/`: inicialização e schema SQL.
- `public/`: documentação visual rápida da API (Swagger UI), sem frontend de produto.

## Rodando localmente

```bash
npm install
npm run dev
```

Servidor padrão: `http://localhost:3000`.

## Documentação rápida de endpoints

Com o servidor rodando, abra:

- `http://localhost:3000/` (Swagger UI)
- `http://localhost:3000/openapi.json` (OpenAPI bruto)

## Deploy

- Railway + Supabase: veja `docs/railway-deploy.md`.
- Estratégias de teste: veja `docs/testing.md`.
