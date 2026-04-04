# 📋 Módulo: Painel de Controle e Admins (Templates)

Quando cronômetros de conversas ultrapassam a barreira de 24 horas estipulada pela Meta, a API REST oficial recusa comunicações nativas do `freeText.js`. Esta pasta reabre sessões administrando templates dinâmicos.

## CRUD Padrão do Frontend

### 1. Rota de Criação Dinâmica (`create.js`)
- `POST /api/v2/templates`
- **Engenharia:** Atua de forma paralela preenchendo o database primário do CRM a cada aprovação manual feita no painel do Meta Business e portadas no portal do Twilio. Recebe obrigatórios (body, content_sid, name) e repassa blocos JSON das variáveis. Proteções `HTTP 409 Conflict` agem ativamente bloqueando chaves duplicadas na engine do Postgres do Supabase (`content_sid`).

### 2. Rota de Distribuição Limpa (`get.js`)
- `GET /api/v2/templates`
- **Engenharia:** Extrai relatórios formatados servindo Arrays diretos para injetar opções visualizadas de templates e opções de conversação em menus do frontend CRM. Exclusão de queries fantasma retirando a flag (`is_active = 0`) das leituras do JSON Array para não injetar HTML de interfaces desnecessárias no Next.js final.
