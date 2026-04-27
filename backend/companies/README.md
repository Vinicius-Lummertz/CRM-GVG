# Modulo: Empresas, Membros e Numeros Comerciais

Este modulo implementa a base multiempresa do CRM usando `profiles`, `companies`, `company_members`, `company_whatsapp_numbers` e `company_member_invites`.

## Fluxo recomendado no front

1. Login cria/retorna um usuario do Supabase Auth.
2. Chame `POST /api/v2/profiles` com o `id` do auth user e o numero pessoal de acesso.
3. Chame `GET /api/v2/companies?user_id=...` para montar o seletor de empresas.
4. Se nao houver empresa, chame `POST /api/v2/companies`.
5. Dentro da empresa, use `POST /api/v2/companies/:companyId/whatsapp-numbers` para conectar o WhatsApp comercial.
6. Para equipe, use convites por telefone em `POST /api/v2/companies/:companyId/invites`.

## Perfis

### Criar/atualizar perfil
`POST /api/v2/profiles`

```json
{
  "id": "uuid-do-auth-user",
  "full_name": "Vinicius",
  "login_phone": "+5548999999999",
  "avatar_url": null
}
```

Se existirem convites pendentes para `login_phone`, o endpoint cria os vinculos em `company_members` automaticamente.

### Buscar por telefone
`GET /api/v2/profiles/by-phone?login_phone=+5548999999999`

## Empresas

### Listar empresas do usuario
`GET /api/v2/companies?user_id=uuid-do-profile`

Retorna apenas empresas em que o usuario e membro ativo.

### Buscar empresa
`GET /api/v2/companies/:companyId?user_id=uuid-do-profile`

Quando `user_id` e enviado, a API valida se o usuario tem acesso ativo a empresa.

### Criar empresa
`POST /api/v2/companies`

```json
{
  "name": "GVG Imoveis",
  "owner_id": "uuid-do-profile"
}
```

Cria a empresa e tambem adiciona o dono como membro `owner`.

## Numeros comerciais

### Listar
`GET /api/v2/companies/:companyId/whatsapp-numbers`

### Adicionar
`POST /api/v2/companies/:companyId/whatsapp-numbers`

```json
{
  "phone_number": "+554833210000",
  "label": "Comercial",
  "provider": "meta",
  "status": "pending",
  "api_config": {}
}
```

### Atualizar
`PUT /api/v2/companies/:companyId/whatsapp-numbers/:numberId`

### Remover
`DELETE /api/v2/companies/:companyId/whatsapp-numbers/:numberId`

## Membros

### Listar membros
`GET /api/v2/companies/:companyId/members`

### Atualizar papel/status
`PUT /api/v2/companies/:companyId/members/:memberId`

```json
{
  "role": "agent",
  "status": "active"
}
```

## Convites

### Listar convites
`GET /api/v2/companies/:companyId/invites`

Use `?status=pending` para filtrar.

### Convidar por numero pessoal
`POST /api/v2/companies/:companyId/invites`

```json
{
  "invited_phone": "+5548999999999",
  "role": "agent",
  "invited_by": "uuid-do-profile"
}
```

Se o perfil ja existir, o membro e criado na hora. Caso contrario, fica um convite pendente e sera aceito automaticamente no `POST /api/v2/profiles` quando esse telefone criar perfil.

### Aceitar convite manualmente
`POST /api/v2/invites/:inviteId/accept`

```json
{
  "user_id": "uuid-do-profile"
}
```
