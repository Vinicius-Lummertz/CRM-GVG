# CRM-GVG - Módulo Backend (v2)

Este diretório contém o motor backend do CRM-GVG. Um sistema para automação de interações via WhatsApp integrando Node.js, Express, Twilio e Supabase.

## 🚀 Tecnologias e Stack
- **Node.js + Express**: API REST padronizada que serve o CRM e lida com webhooks.
- **Supabase (PostgreSQL)**: Banco Mestre contendo schemas de `leads`, `messages`, `otp_challenges` e `templates`.
- **Twilio SDK**: Comunicação e disparos WhatsApp (Content API & Inbound routing).

## ⚙️ Variáveis de Ambiente (`.env`)
O arquivo `.env` contido nesta raiz precisa desta estrutura:
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_ACCOUNT_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+...
TWILIO_CONTENT_SID=HX...        # O ID único gerado do "Content Template Builder" do Meta para o processo OTP

SUPABASE_URL=https://...
SUPABASE_SECRET_KEY=...
```

## 🗂️ Organização das Rotas (API v2)
Este repositório está subdividido por contextos em pastas com seus próprios READMEs detalhados (mergulhe para mais informações específicas do código do módulo):
- **`/messages`** → Gestão mestre do Chat Inbound (Webhook). ([Ver Documentação](./messages/README.md))
- **`/messages/send`** → Envios Ativos (OTP Auth e Free Chat do CRM). ([Ver Documentação](./messages/send/README.md))
- **`/messages/verify`** → Regras de segurança e hash de validação (OTP). ([Ver Documentação](./messages/verify/README.md))
- **`/templates`** → Gestão administrativa dos templates da Meta. ([Ver Documentação](./templates/README.md))

## 🏃 Como rodar localmente
```bash
npm install
npm run dev

# Mantenha o ngrok atrelado à porta 3000 para captar webhooks do Twilio localmente!
```
