# Database migrations

## `2026-04-27-multi-company-operational.sql`

Adiciona isolamento multiempresa nas tabelas operacionais:

- `leads.company_id`
- `leads.whatsapp_number_id`
- `messages.company_id`
- `messages.whatsapp_number_id`
- `templates.company_id`
- `events.company_id`

Tambem cria as FKs para `companies` e `company_whatsapp_numbers`, alem dos indices usados pela Home, chat, templates e agenda.

Depois de vincular os dados legados a uma empresa, rode manualmente os `alter column ... set not null` deixados comentados no fim do arquivo.
