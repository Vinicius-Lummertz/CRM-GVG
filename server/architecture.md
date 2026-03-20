# Backend Architecture

## Visao Geral
Este backend foi organizado em camadas para manter responsabilidades separadas e facilitar manutencao sem alterar comportamento da API.

Fluxo principal:
1. `server.js` carrega config e chama bootstrap.
2. `server/bootstrap.js` monta dependencias (DB, CRM, SSE, Twilio proxy).
3. `server/http/createApp.js` cria o app Express e registra rotas.
4. Controllers chamam use-cases.
5. Use-cases aplicam regras de dominio e usam repositories para persistencia.

## Estrutura de Pastas

### `config/`
- Centraliza leitura de `.env` e normalizacao de valores.
- Arquivo principal: `config/index.js`.
- Exporta objetos imutaveis de config: app, db, ai, twilio.

### `http/`
- Cria e configura o Express (middlewares + static files + rotas).
- Arquivo principal: `http/createApp.js`.

### `routes/`
- Define endpoints por area e conecta cada rota a um controller.
- Arquivos:
- `healthRoutes.js`
- `leadsRoutes.js`
- `eventsRoutes.js`
- `mediaRoutes.js`
- `webhookRoutes.js`
- `index.js` agrega o registro de todas as rotas.

### `controllers/`
- Traduz HTTP -> chamada de use-case/integration.
- Nao contem regra de negocio pesada.
- Arquivos:
- `healthController.js`
- `leadsController.js`
- `eventsController.js`
- `mediaController.js`
- `webhookController.js`
- `index.js` instancia todos os controllers com dependencias.

### `use-cases/crm/`
- Regras de aplicacao do CRM, separadas por caso de uso.
- Arquivos:
- `createCrmService.js`: composer do servico CRM.
- `inbound.js`: processamento de webhook inbound.
- `queries.js`: consultas de leads e mensagens.
- `analysis.js`: fila + execucao de analise IA + aplicacao de resultado.
- `state.js`: inicializacao/garantia de `conversation_state`.

### `repositories/`
- Camada de acesso a dados (SQLite).
- Sem regra de negocio, foco em SQL e persistencia.
- Arquivos por agregado:
- `leadsRepository.js`
- `messagesRepository.js`
- `messageMediaRepository.js`
- `conversationStateRepository.js`
- `leadEventsRepository.js`
- `aiAnalysisRunsRepository.js`
- `index.js` agrega todos.

### `domain/`
- Funcoes puras e regras reutilizaveis (sem I/O externo).
- Arquivos:
- `classificationConstants.js`: enums de status/eventos/temperatura.
- `pipelineRules.js`: score, temperatura, trigger forte, pipeline position.
- `messageParsing.js`: parsing de payload Twilio e inferencia de tipo.
- `leadViewMapper.js`: mapeamento da view de lead para API.
- `id.js`: geracao de IDs.
- `time.js`: utilitario de timestamp ISO.

### `integrations/`
- Integracoes externas e adaptadores.
- `aiClassifier.js`: chamada Gemini + normalizacao da classificacao.
- `twilioMediaProxy.js`: proxy seguro para midia Twilio.

### `events/`
- Infra de eventos em tempo real.
- `sseHub.js`: conexao/broadcast/heartbeat para Server-Sent Events.

## Entry Points
- `server.js`: orquestrador minimo.
- `server/index.js`: exporta `loadConfig` e `startServer`.
- `server/bootstrap.js`: monta app e inicia `listen`.

## Mapa de Endpoints
- `GET /health`
- `GET /api/leads`
- `GET /api/leads/:leadId/messages`
- `GET /api/events`
- `GET /api/media-proxy`
- `POST /api/whatsapp/webhook`

## Contratos e Limites
- API HTTP deve manter paridade de comportamento.
- Schema SQLite e semantica de dados devem permanecer iguais.
- Variaveis de ambiente legadas devem continuar aceitas.
- Mudancas de regra de negocio devem entrar em `domain/` + `use-cases/`.
- Mudancas de SQL devem entrar em `repositories/`.

## Guia Rapido para Evolucao
- Nova rota: `routes/` + `controller` + (se necessario) `use-case`.
- Nova regra de negocio: `domain/` e uso via `use-cases/`.
- Nova query/tabela: `repositories/` (e migracao em `db/` quando aplicavel).
- Nova integracao externa: `integrations/`.
