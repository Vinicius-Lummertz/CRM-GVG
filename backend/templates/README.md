# Modulo: Templates

Este modulo gerencia templates de mensagem usados para retomar conversas fora da janela de 24 horas.

Todos os endpoints operam dentro da empresa selecionada.

## Endpoints

### Criar template
- **Rota:** `POST /api/v2/templates`
- **Arquivo:** `create.js`

#### Body obrigatorio
```json
{
  "company_id": "uuid-da-empresa",
  "name": "Retomada de contato",
  "body": "Ola {{1}}, podemos continuar?",
  "content_sid": "HX..."
}
```

#### Body opcional
- `language`: default `pt_BR`.
- `category`: default `utility`.
- `variables_json`: objeto ou string JSON.
- `created_by_operator_id`: legado.

### Listar templates ativos
- **Rota:** `GET /api/v2/templates?company_id=uuid-da-empresa`
- **Arquivo:** `get.js`

Retorna apenas templates ativos (`is_active = 1`) da empresa selecionada.
