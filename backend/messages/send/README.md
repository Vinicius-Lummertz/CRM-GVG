# Modulo: Envios Ativos (OTP & Outbound Free Text)

Este subdiretorio possui dois fluxos que disparam mensagens pelo Twilio e mantem historico no Supabase.

## 1. Disparo de Autenticacao Automatica (OTP)

- **Arquivo de codigo:** `otp.js`
- **Tabela relacionada:** `otp_challenges`
- **Uso:** verificacoes de entrada com codigo temporario.

Regras principais:
- Checa desafios recentes para reduzir abuso e retornar HTTP 429 quando necessario.
- Gera codigo de 6 digitos e salva hash com `crypto.createHash('sha256')`.
- Envia via Twilio usando template aprovado com Content SID.

## 2. Chat Manual do CRM (Free Text)

- **Arquivo de codigo:** `freeText.js`
- **Implementacao atual:** delega para `../../chat/sendText.js`
- **Tabela relacionada:** `messages`
- **Uso:** mensagens livres de operadores internos durante a janela de 24 horas.

Regras principais:
- Valida a janela de 24 horas usando `leads.last_inbound_at`.
- Normaliza o telefone a partir do proprio lead.
- Salva mensagem outbound em `messages`.
- Atualiza o resumo da conversa em `leads`.

Para o contrato completo do chat, consulte `backend/chat/README.md`.
