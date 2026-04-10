# Modulo: Sandbox WhatsApp (Teste controlado sem persistencia)

Este modulo cria endpoints de teste em `/api/sandbox/*` para simular os fluxos reais de OTP/chat sem gravar dados no Supabase.

## Objetivo
- Reaproveitar o contrato da API real para o front testar sem mudar payload.
- Usar o numero oficial do Sandbox Twilio (`+14155238886`).
- Reduzir risco de custo acidental com protecao por flag, API key e allowlist.

## Configuracao de ambiente
Adicione estas variaveis no `backend/.env`:

```env
SANDBOX_ENABLED=1
SANDBOX_API_KEY=troque-por-um-segredo-forte
SANDBOX_ALLOWED_TO_NUMBERS=+5548999990000,+5548999991111

TWILIO_SANDBOX_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_SANDBOX_JOIN_CODE=spring-went
TWILIO_SANDBOX_CONTENT_SID=HXb5b62575e6e4ff6129ad7c8efe1f983e
```

Regras de seguranca:
- `SANDBOX_ENABLED` precisa estar ativo.
- Header `x-sandbox-key` e obrigatorio em toda chamada.
- Apenas numeros em `SANDBOX_ALLOWED_TO_NUMBERS` podem receber mensagens.

## Fluxo recomendado
1. Rodar preflight para validar ambiente e receber instrucoes.
2. No WhatsApp do numero de teste, enviar `join <codigo>` para `+14155238886`.
3. Testar OTP send/verify.
4. Testar chat send.
5. Se cair na janela de 24h fechada (`63016`), usar `/api/sandbox/templates/send`.

## Endpoints

### POST `/api/sandbox/session/preflight`
- Body opcional: `{ "phone": "+55..." }`
- Nao envia mensagem.
- Retorna status de prontidao, instrucoes de join e `contentSid` efetivo.

### POST `/api/sandbox/otp/send`
- Body: `{ "phone": "+55..." }`
- Envia template via sandbox Twilio.
- Sem gravacao em `otp_challenges`.
- Retorno principal:
```json
{
  "success": true,
  "challengeId": "uuid",
  "message": "Codigo enviado em modo sandbox!",
  "sandboxOtpCode": "123456"
}
```

### POST `/api/sandbox/otp/verify`
- Body: `{ "phone": "+55...", "code": "123456" }`
- Validacao estrutural somente.
- Sem leitura/escrita em banco.

### POST `/api/sandbox/chat/send`
- Body: `{ "phone": "+55...", "text": "Ola", "lead_id": "uuid-do-front" }`
- Envia free-form pelo sandbox.
- Sem gravacao em `messages`.
- Se erro `63016`, retorna orientacao para usar `/api/sandbox/templates/send`.

### POST `/api/sandbox/templates/send`
- Body:
```json
{
  "phone": "+55...",
  "contentSid": "opcional",
  "contentVariables": { "1": "Sandbox", "2": "123456" }
}
```
- Util para reabrir/conduzir testes fora da janela de 24h.
- Se `contentSid` nao vier no body, usa `TWILIO_SANDBOX_CONTENT_SID`.

## Erros mapeados da Twilio
- `63015`: numero ainda nao entrou no sandbox (instruimos a enviar `join <code>`).
- `63016`: fora da janela de 24h para mensagem livre (instruimos fallback para template).

## Exemplo cURL rapido

```bash
# 1) Preflight
curl --request POST "http://localhost:3000/api/sandbox/session/preflight" \
  --header "Content-Type: application/json" \
  --header "x-sandbox-key: troque-por-um-segredo-forte" \
  --data "{\"phone\":\"+5548999990000\"}"

# 2) OTP send
curl --request POST "http://localhost:3000/api/sandbox/otp/send" \
  --header "Content-Type: application/json" \
  --header "x-sandbox-key: troque-por-um-segredo-forte" \
  --data "{\"phone\":\"+5548999990000\"}"

# 3) OTP verify
curl --request POST "http://localhost:3000/api/sandbox/otp/verify" \
  --header "Content-Type: application/json" \
  --header "x-sandbox-key: troque-por-um-segredo-forte" \
  --data "{\"phone\":\"+5548999990000\",\"code\":\"123456\"}"

# 4) Chat send
curl --request POST "http://localhost:3000/api/sandbox/chat/send" \
  --header "Content-Type: application/json" \
  --header "x-sandbox-key: troque-por-um-segredo-forte" \
  --data "{\"phone\":\"+5548999990000\",\"text\":\"Teste sandbox\",\"lead_id\":\"lead-local-1\"}"
```
