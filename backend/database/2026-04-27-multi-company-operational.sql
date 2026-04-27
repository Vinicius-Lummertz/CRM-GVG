-- Migra as tabelas operacionais para o modelo multiempresa.
-- Rode depois de criar: profiles, companies, company_members,
-- company_whatsapp_numbers e company_member_invites.

alter table public.leads
  add column if not exists company_id uuid null,
  add column if not exists whatsapp_number_id uuid null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_company_id_fkey') then
    alter table public.leads
      add constraint leads_company_id_fkey
      foreign key (company_id) references public.companies (id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_whatsapp_number_id_fkey') then
    alter table public.leads
      add constraint leads_whatsapp_number_id_fkey
      foreign key (whatsapp_number_id) references public.company_whatsapp_numbers (id) on delete set null;
  end if;
end $$;

create index if not exists idx_leads_company_updated
  on public.leads using btree (company_id, updated_at desc);

create index if not exists idx_leads_company_external_key
  on public.leads using btree (company_id, external_key);

alter table public.messages
  add column if not exists company_id uuid null,
  add column if not exists whatsapp_number_id uuid null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_company_id_fkey') then
    alter table public.messages
      add constraint messages_company_id_fkey
      foreign key (company_id) references public.companies (id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'messages_whatsapp_number_id_fkey') then
    alter table public.messages
      add constraint messages_whatsapp_number_id_fkey
      foreign key (whatsapp_number_id) references public.company_whatsapp_numbers (id) on delete set null;
  end if;
end $$;

create index if not exists idx_messages_company_lead_created
  on public.messages using btree (company_id, lead_id, created_at desc);

alter table public.templates
  add column if not exists company_id uuid null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'templates_company_id_fkey') then
    alter table public.templates
      add constraint templates_company_id_fkey
      foreign key (company_id) references public.companies (id) on delete cascade;
  end if;
end $$;

create index if not exists idx_templates_company_active
  on public.templates using btree (company_id, is_active, created_at desc);

alter table public.events
  add column if not exists company_id uuid null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_company_id_fkey') then
    alter table public.events
      add constraint events_company_id_fkey
      foreign key (company_id) references public.companies (id) on delete cascade;
  end if;
end $$;

create index if not exists idx_events_company_time
  on public.events using btree (company_id, start_time);

-- Depois de vincular os dados legados a uma empresa, recomendamos tornar obrigatorio:
-- alter table public.leads alter column company_id set not null;
-- alter table public.messages alter column company_id set not null;
-- alter table public.templates alter column company_id set not null;
-- alter table public.events alter column company_id set not null;
