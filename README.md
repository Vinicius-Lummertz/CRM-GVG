# CRM-GVG - Modulo Backend (v2)

Este repositorio contem o backend do CRM-GVG para automacao de interacoes via WhatsApp usando Node.js, Express, Twilio e Supabase.

## Tecnologias e Stack
- **Node.js + Express**: API REST padronizada para o CRM e webhooks.
- **Supabase (PostgreSQL)**: banco principal com `leads`, `messages`, `otp_challenges` e `templates`.
- **Twilio SDK**: envio e recebimento de mensagens WhatsApp.

## Variaveis de Ambiente (`backend/.env`)
O arquivo `.env` na pasta `backend` precisa conter:
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_ACCOUNT_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+...
TWILIO_CONTENT_SID=HX...
TWILIO_SANDBOX_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_SANDBOX_JOIN_CODE=spring-went
TWILIO_SANDBOX_CONTENT_SID=HX...

SUPABASE_URL=https://...
SUPABASE_SECRET_KEY=...

SANDBOX_ENABLED=1
SANDBOX_API_KEY=...
SANDBOX_ALLOWED_TO_NUMBERS=+55..., +55...
```

## Organizacao das Rotas (API v2)
- **`/messages`**: webhook inbound do WhatsApp. ([Ver documentacao](./backend/messages/README.md))
- **`/messages/send`**: envios ativos (OTP e texto livre). ([Ver documentacao](./backend/messages/send/README.md))
- **`/messages/verify`**: validacao e seguranca do OTP. ([Ver documentacao](./backend/messages/verify/README.md))
- **`/templates`**: cadastro e listagem de templates Meta/Twilio. ([Ver documentacao](./backend/templates/README.md))
- **`/leads`**: listagem, busca e criacao manual de leads. ([Ver documentacao](./backend/leads/README.md))
- **`/sandbox`**: endpoints de teste OTP/chat sem persistencia no banco. ([Ver documentacao](./backend/sandbox/README.md))

## Como rodar localmente
```bash
cd backend
npm install
npm run dev
```
