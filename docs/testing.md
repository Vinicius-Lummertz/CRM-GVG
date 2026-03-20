# Testing Guide

## Environment Variables

Use these in `.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5.4-nano
# optional fallback for local testing only:
# ALLOW_DEBUG_OTP=true
```

## Twilio Payload Samples

### 1) Text message

```txt
From=whatsapp:+5548933333333
WaId=5548933333333
ProfileName=Ana
Body=Oi, tenho interesse
MessageSid=SMTXT001
NumMedia=0
```

### 2) Image message

```txt
From=whatsapp:+5548999999999
WaId=5548999999999
ProfileName=Joao Teste
Body=
MessageSid=SMIMG001
NumMedia=1
MediaUrl0=https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME...
MediaContentType0=image/jpeg
```

## Analysis Scenarios (expected)

1. Lead becomes `interessado`: customer asks prices and next steps.
2. Lead becomes `negociando`: customer asks discount/payment conditions.
3. Lead becomes `ganho`: customer confirms acceptance.
4. Lead becomes `perdido`: customer says no interest / gave up.
5. Lead remains same: weak signals or low confidence.

## Local Curl Tests (Windows cmd)

### Text

```bat
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "From=whatsapp:+5548933333333" ^
  --data-urlencode "WaId=5548933333333" ^
  --data-urlencode "ProfileName=Ana" ^
  --data-urlencode "Body=Oi, tenho interesse em valores" ^
  --data-urlencode "MessageSid=SMTXT001" ^
  --data-urlencode "NumMedia=0"
```

### Image

```bat
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "From=whatsapp:+5548999999999" ^
  --data-urlencode "WaId=5548999999999" ^
  --data-urlencode "ProfileName=Joao Teste" ^
  --data-urlencode "Body=" ^
  --data-urlencode "MessageSid=SMIMG001" ^
  --data-urlencode "NumMedia=1" ^
  --data-urlencode "MediaUrl0=https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME..." ^
  --data-urlencode "MediaContentType0=image/jpeg"
```

### Strong trigger example (forces analysis)

```bat
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "From=whatsapp:+5548944444444" ^
  --data-urlencode "WaId=5548944444444" ^
  --data-urlencode "ProfileName=Cliente Fechamento" ^
  --data-urlencode "Body=aceito, pode fechar" ^
  --data-urlencode "MessageSid=SMTRG001" ^
  --data-urlencode "NumMedia=0"
```

## Endpoints for Validation

- `GET /health`
- `GET /api/leads`
- `GET /api/leads/:leadId/messages?limit=100`
- `GET /api/events` (SSE)
- `GET /api/media-proxy?url=...`
