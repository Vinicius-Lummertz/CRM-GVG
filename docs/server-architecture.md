# Backend Architecture

## Estrutura atual (simplificada)

A estrutura do backend foi consolidada para ficar centrada em:

- `server.js` → orquestrador único do servidor (config, db, serviços, middlewares e rotas)
- `server/core/` → regras de negócio, domínio, composição de serviços e acesso a dados
- `server/routes/` → declaração de endpoints, handlers HTTP e middlewares HTTP
- `server/integrations/` → integrações externas (Twilio, IA, etc.)

## Fluxo principal

1. `server.js` carrega configuração via `server/core/config.js`.
2. Inicializa DB via `server/core/database/initDb.js`.
3. Sobe serviços de domínio (`core/crm`, `core/v1`, etc.).
4. Monta app Express e registra rotas de `server/routes/`.
5. Inicia `listen`.

## Organização em `core/`

- `core/auth`, `core/conversations`, `core/templates`, `core/providerWebhooks`
- `core/crm` (fluxos do CRM)
- `core/v1` (composição/compatibilidade dos serviços v1)
- `core/domain` (funções puras)
- `core/repositories` (persistência)
- `core/events` (SSE)
- `core/database` (bootstrap do cliente DB)

## Organização em `routes/`

- Arquivos de rota por categoria (`auth.js`, `conversations.js`, `templates.js`, `events.js`, `providerWebhooks.js`)
- Wrappers legados V1 para compatibilidade (`*V1Routes.js`)
- `routes/handlers/*` para tradução HTTP ↔ serviços
- `routes/middleware/auth.js` para autenticação

## Objetivo

Reduzir salto entre arquivos para quem precisa entender rapidamente:
- qual endpoint usar,
- qual payload enviar,
- e onde a regra é processada.
