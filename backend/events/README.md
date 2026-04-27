# Modulo: Agenda (Eventos)

Este modulo disponibiliza endpoints para gerenciamento de eventos da agenda com persistencia via Supabase nas tabelas `events` e `event_attendees`.

## Endpoints

### 1. Listar eventos
- **Rota:** `GET /api/v2/events`
- **Arquivo:** `get.js`

#### Query Params
- `company_id` (obrigatorio): UUID da empresa selecionada.
- `user_id` (opcional): UUID do usuario dono/responsavel pela agenda.
- `from` (opcional): data inicial para buscar eventos que cruzam a janela.
- `to` (opcional): data final para buscar eventos que cruzam a janela.
- `status` (opcional): `Pendente`, `Confirmada`, `Cancelada` ou `Finalizada`.
- `related_type` (opcional): `Contrato`, `Fechamento` ou `Alinhamento`.
- `related_id` (opcional): UUID do registro relacionado.
- `include_attendees` (opcional): use `false` para retornar apenas eventos.

### 2. Buscar evento por ID
- **Rota:** `GET /api/v2/events/:eventId`
- **Arquivo:** `getById.js`

### 3. Criar evento
- **Rota:** `POST /api/v2/events`
- **Arquivo:** `create.js`

#### Body
```json
{
  "user_id": "uuid-do-usuario",
  "company_id": "uuid-da-empresa",
  "title": "Reuniao de alinhamento",
  "description": "Briefing inicial",
  "location": "Google Meet",
  "start_time": "2026-04-27T13:00:00.000Z",
  "end_time": "2026-04-27T14:00:00.000Z",
  "is_online": true,
  "status": "Pendente",
  "related_type": "Alinhamento",
  "related_id": "uuid-opcional",
  "external_id": "google-calendar-id-opcional",
  "sync_metadata": {},
  "attendees": [
    {
      "lead_id": "id-do-lead-opcional",
      "email": "cliente@email.com",
      "full_name": "Cliente",
      "is_internal": false
    }
  ]
}
```

### 4. Atualizar evento
- **Rota:** `PUT /api/v2/events/:eventId`
- **Arquivo:** `update.js`

O body aceita os mesmos campos da criacao, todos opcionais. Quando `attendees` for enviado, a lista substitui os participantes atuais do evento.

### 5. Remover evento
- **Rota:** `DELETE /api/v2/events/:eventId`
- **Arquivo:** `delete.js`

Os participantes sao removidos automaticamente pelo `ON DELETE CASCADE`.

## Regras

- `end_time` deve ser maior que `start_time`.
- `is_online` deve ser booleano.
- `status` aceita apenas os valores definidos no banco.
- `related_type` aceita apenas os valores definidos no banco.
- `sync_metadata` deve ser um objeto JSON.
- `attendees` deve ser uma lista; cada participante precisa ter `email` valido.
