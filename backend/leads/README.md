# Modulo: Leads (Listagem, Busca e Criacao Manual)

Este modulo disponibiliza os endpoints de gerenciamento de leads no CRM com persistencia via Supabase.

## Endpoints

### 1. Listar e buscar leads
- **Rota:** `GET /api/v2/leads`
- **Arquivo:** `get.js`

#### Query Params
- `search` (opcional): termo de busca.
- `by` (opcional): `auto` (default), `name` ou `number`.
- `company_id` (obrigatorio): UUID da empresa selecionada.

#### Regras de busca
- `by=name`: busca parcial e case-insensitive em `name`.
- `by=number`: normaliza o termo para digitos e busca parcialmente em `phone`, `external_key` e `wa_id`.
  - Trata variacoes com e sem o `9` apos o DDD.
  - Quando a busca vem sem `55`, tenta o formato brasileiro com prefixo automaticamente.
- `by=auto`: combina busca por nome + numero no mesmo termo.

#### Resposta de sucesso (`200`)
```json
{
  "success": true,
  "count": 2,
  "leads": [
    {
      "id": "uuid",
      "name": "Joao Silva",
      "phone": "+554896290225",
      "external_key": "whatsapp:+554896290225",
      "wa_id": "554896290225",
      "updated_at": "2026-04-10T19:20:00.000Z"
    }
  ]
}
```

#### Erros possiveis
- `400`: parametro `by` invalido.
- `500`: falha interna de banco/processamento.

---

### 2. Criar lead manualmente
- **Rota:** `POST /api/v2/leads`
- **Arquivo:** `create.js`

#### Body obrigatorio
```json
{
  "company_id": "uuid-da-empresa",
  "name": "Maria Souza",
  "phone": "5548999991111"
}
```

#### Normalizacao automatica de telefone
- O endpoint aceita apenas numeros do Brasil com codigo do pais `55`.
- Entrada aceita: `55...`, `+55...` ou `whatsapp:+55...`.
- Se faltar o `55`, a API retorna `400`.
- Se vier com o `9` apos o DDD (ex.: `+5548996290225`), o backend remove esse `9` antes de salvar para manter o padrao legado da base.
- Persistencia:
  - `phone`: `+55...`
  - `external_key` / `whatsapp_from`: `whatsapp:+55...`
  - `wa_id`: somente digitos

#### Resposta de sucesso (`201`)
```json
{
  "success": true,
  "leadId": "uuid",
  "message": "Lead criado com sucesso!"
}
```

#### Erros possiveis
- `400`: body invalido (ausencia de `name`/`phone`, nome vazio, telefone invalido).
- `409`: telefone ja cadastrado na base.
- `500`: falha interna de banco/processamento.

## Exemplos rapidos (cURL)

```bash
# Listar todos
curl --request GET "http://localhost:3000/api/v2/leads"

# Buscar por nome
curl --request GET "http://localhost:3000/api/v2/leads?search=maria&by=name"

# Buscar por numero (aceita busca parcial)
curl --request GET "http://localhost:3000/api/v2/leads?search=4899999&by=number"

# Busca inteligente (nome + numero)
curl --request GET "http://localhost:3000/api/v2/leads?search=joao%2048999&by=auto"

# Criar lead
curl --request POST "http://localhost:3000/api/v2/leads" \
  --header "Content-Type: application/json" \
  --data "{\"name\":\"Maria Souza\",\"phone\":\"whatsapp:+5548996290225\"}"

# Exemplo que deve falhar (sem codigo 55)
curl --request POST "http://localhost:3000/api/v2/leads" \
  --header "Content-Type: application/json" \
  --data "{\"name\":\"Isadora\",\"phone\":\"4891089414\"}"
```
