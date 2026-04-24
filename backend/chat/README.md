# Modulo: Chat WhatsApp CRM

Este modulo concentra os endpoints que o frontend do chat deve consumir. O provedor de envio e a Twilio, com persistencia no Supabase.

## Regras principais

- Mensagem livre so pode ser enviada quando `leads.last_inbound_at` estiver dentro da janela de 24 horas.
- Fora da janela, o operador deve iniciar ou retomar a conversa com um template aprovado.
- O telefone efetivo do envio vem do proprio lead (`whatsapp_from`, `external_key` ou `phone`). O campo `phone` no body fica como fallback.
- Historico de conversa e paginado para evitar consultas grandes.
- Ao configurar `TWILIO_STATUS_CALLBACK_URL`, a Twilio pode atualizar `delivery_status` no endpoint de status.

## Endpoints

### GET `/api/v2/chat/:leadId/messages`

Busca o historico paginado de uma conversa.

Query params:
- `limit` opcional. Padrao: `50`. Maximo: `100`.
- `before` opcional. Data ISO para buscar mensagens mais antigas que aquele instante.

Resposta:

```json
{
  "success": true,
  "count": 2,
  "hasMore": false,
  "nextBefore": null,
  "messages": [
    {
      "id": "uuid",
      "lead_id": "uuid",
      "direction": "inbound",
      "body": "Oi",
      "delivery_status": "received",
      "created_at": "2026-04-24T12:00:00.000Z"
    }
  ]
}
```

### POST `/api/v2/chat/send`

Envia texto livre dentro da janela de 24 horas.

Body:

```json
{
  "lead_id": "uuid-do-lead",
  "text": "Mensagem do atendente",
  "phone": "+5548999990000"
}
```

Observacoes:
- `phone` e opcional quando o lead ja possui telefone valido.
- O limite de texto e 4096 caracteres.
- Se a janela estiver fechada, retorna `WINDOW_CLOSED` com fallback para template.

Erro de janela fechada:

```json
{
  "success": false,
  "error": "WINDOW_CLOSED",
  "message": "Janela de 24h fechada. Use um template aprovado para iniciar ou retomar a conversa.",
  "fallbackEndpoint": "/api/v2/chat/send-template",
  "templatesEndpoint": "/api/v2/templates"
}
```

### POST `/api/v2/chat/send-template`

Envia um template aprovado pela Twilio/Meta usando o `content_sid` cadastrado em `templates`.

Body recomendado:

```json
{
  "lead_id": "uuid-do-lead",
  "template_id": "uuid-do-template",
  "variables": {
    "1": "Vinicius",
    "2": "GVG"
  }
}
```

Body alternativo:

```json
{
  "lead_id": "uuid-do-lead",
  "content_sid": "HX...",
  "contentVariables": {
    "1": "Vinicius"
  }
}
```

O backend valida placeholders numericos do body do template, como `{{1}}`, antes de chamar a Twilio.

### POST `/api/v2/chat/:leadId/read`

Marca a conversa como lida no CRM.

Efeito:
- `unread_count = 0`
- `messages_after_last_resume = 0`

### POST `/api/v2/chat/status-webhook`

Webhook opcional para status de entrega da Twilio.

Configure a variavel:

```env
TWILIO_STATUS_CALLBACK_URL=https://seu-dominio.com/api/v2/chat/status-webhook
```

O endpoint atualiza `messages.delivery_status` usando `MessageSid`.

### POST `/api/v2/chat/webhook`

Alias semantico para o webhook inbound que ja existia em `/api/v2/otp/webhook`.

Use este endpoint na Twilio quando quiser separar mentalmente OTP de chat. O payload esperado continua sendo o webhook padrao da Twilio para WhatsApp (`From`, `Body`, `MessageSid`, `ProfileName`).

## Endpoints relacionados

### GET `/api/v2/leads`

Agora cada lead retorna tambem:

```json
{
  "conversation_window": {
    "is_open": true,
    "opened_at": "2026-04-24T12:00:00.000Z",
    "expires_at": "2026-04-25T12:00:00.000Z",
    "remaining_seconds": 86300
  }
}
```

### GET `/api/v2/templates`

Lista templates ativos para o botao "Templates" do frontend.