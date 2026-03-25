# 📤 Módulo: Envios Ativos (OTP & Outbound Free Text)

Este subdiretório possui dois fluxos distintos que disparam, em nome do Twilio, requisições pesadas diretamente para os Handsets dos usuários finais. Ambos salvam histórico no Supabase.

## 1. Disparo de Autenticação Automática (OTP)
- **Arquivo de código:** `otp.js`
- **Tabela Relacionada:** `otp_challenges`
- **Arquitetura (Como Funciona):** Utilizado primariamente durante verificações de entrada.
  - Para garantir estabilidade Financeira (Anti-spam), uma checagem restrita analisa a base `otp_challenges` validando a existência de ordens abertas em um frame de 15 minutos e bloqueia o tráfego HTTP 429.
  - O código de 6 números é matematicamente fabricado. Hashes seguros via Node.js Vanilla `crypto.createHash('sha256')` o empacotam na tabela transiente de pendências do Supabase.
  - A requisição para enviar ao device executa os Content Variáveis das Templates recém registradas e aprovadas pelo Facebook Developer via Twilio Content SID.

## 2. Chat Manual do CRM (Free Text)
- **Arquivo de código:** `freeText.js`
- **Tabela Relacionada:** `messages`
- **Arquitetura (Como Funciona):** Usado unicamente pelos operadores internos no front-end do CRM visualizando conversas que já se encontram com `direction: inbound` rodando pela janela virtual das 24 Horas ativas do Meta.
  - Este evento é cru e simples: envia a string crua direto no client WhatsApp via Content API Body Injection, omitindo o motor de validações de templates.
  - Silenciosamente reproduz a string para preenchimento persistente do Supabase dentro de relatórios da tabulação `messages` assinalando `outbound`.
