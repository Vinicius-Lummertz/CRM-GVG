# 📨 Módulo: Messages (Mestre e Inbound)

Este módulo controla o fluxo principal de chegada de mensagens via WhatsApp (Webhook). 

## Endpoints

### 1. Webhook Recebedor do Twilio
- **Rota:** `POST /api/v2/otp/webhook` (no `server.js`)
- **Arquivo de controlador:** `get.js`

#### Fluxo de Operação (`get.js`)
Quando um cliente responde ao nosso número, o servidor do Twilio engatilha essa rota enviando form-data pesados e exigindo um parsing de `urlencoded` do Express:
1. **Atribuição do Lead:** É feito um `SELECT` na tabela `leads` filtrando pelo telefone ("From") do cliente.
2. **Upsert Dinâmico:** Se o celular não existir na base, criamos a linha do Lead de forma completamente automática usando UUIDs e nomes de perfil do Whatsapp. Se já constar, atualizamos timestamp `last_message_at` e incrementos de `unread_count`.
3. **Registro da Mensagem:** O corpo de texto puro que chegou passa na esteira e é introduzido em `messages` com flag `direction: inbound` e atrelado perfeitamente via Chave Estrangeira (FK) pelo novo/velho `lead_id`. O SID mestre do webhook batiza a mensagem.
4. **Alimentação TwiML:** O Twilio exige a conformidade. Respondemos sem payloads, apenas um XML de `<Response></Response>` em branco, mantendo a performance rápida e travando HTTP 200 de sucesso.
