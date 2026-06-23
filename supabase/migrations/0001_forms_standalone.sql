-- =======================================================================
-- 0001_forms_standalone.sql — Módulo de formulários interativos (standalone)
-- =======================================================================
-- Versão self-contained do módulo de Forms da Komplexa, SEM acoplamento
-- com o CRM (não cria leads/companies/contacts/notifications).
--
-- O que faz:
--   - Forms públicos por slug (typeform-like): welcome → perguntas → obrigado
--   - Tracking completo: views, progressão, abandono, tempo por step,
--     erros de validação, atribuição UTM + fbclid + gclid + landing_url
--   - Captura de respostas em form_submissions (sem criar lead)
--   - Captura parcial (form_partials) pra recuperação ativa
--   - Stats acionáveis por campanha/anúncio (get_form_stats)
--   - Admin builder: criar/editar/clonar forms (auth via Supabase Auth)
--
-- Tudo via RPC security definer — o form público usa a role `anon`.
-- =======================================================================

-- ---------- helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- =======================================================================
-- PROFILES — mínimo, só pra autenticação do admin + atribuição de owner
-- =======================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'admin',
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "auth read profiles" on public.profiles for select using (auth.uid() is not null);
create policy "user updates own profile" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Cria profile automaticamente quando um usuário se cadastra no Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =======================================================================
-- ENUMS
-- =======================================================================
create type form_field_type as enum (
  'text', 'long_text', 'email', 'phone',
  'select', 'multi_select', 'range', 'yes_no',
  'cpf', 'cnpj',
  'meeting_slot',  -- agendamento (datetime-local)
  'file',          -- anexo (PDF/DOC/imagem) — bucket form-uploads
  'number',        -- inteiro genérico
  'currency'       -- valor BRL
);

-- mapeamento explícito de campos (usado pra extrair nome/contato da resposta)
create type form_field_mapping as enum (
  'company_name', 'company_city', 'company_state', 'company_uhs', 'company_website',
  'contact_name', 'contact_role', 'contact_email', 'contact_whatsapp',
  'note',
  'meeting_at'
);

-- =======================================================================
-- FORMS
-- =======================================================================
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  -- propósito (mantido por compat — não muda comportamento de lead aqui)
  purpose text not null default 'lead' check (purpose in ('lead', 'recruitment', 'info')),
  -- welcome (texto)
  welcome_eyebrow text,
  welcome_title text not null default 'Vamos conversar?',
  welcome_subtitle text,
  welcome_button_text text not null default 'Começar',
  welcome_bullets jsonb not null default '[]'::jsonb,
  -- welcome (visual / LP customization)
  welcome_layout text default 'minimal'
    check (welcome_layout in ('minimal', 'hero_image', 'hero_video', 'social_proof', 'testimonial', 'quiz_stats', 'none')),
  hero_image_url text,
  hero_video_url text,
  logo_url text,
  primary_color text,
  background_gradient text,
  social_proof_logos jsonb,
  testimonial jsonb,
  hero_stat jsonb,
  -- thank-you
  thank_you_title text not null default 'Recebemos!',
  thank_you_message text default 'Em breve entramos em contato.',
  redirect_url text,
  -- meta
  active boolean not null default true,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_forms_updated before update on public.forms
  for each row execute function public.set_updated_at();
create index on public.forms (owner_id);
create index on public.forms (active);
create index on public.forms (purpose);

-- ---------- FORM_FIELDS ----------
create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  field_type form_field_type not null,
  label text not null,
  description text,
  placeholder text,
  required boolean not null default false,
  options jsonb default '[]'::jsonb,
  display_order integer not null default 0,
  validation_regex text,
  min_value numeric,
  max_value numeric,
  field_mapping form_field_mapping default 'note',
  created_at timestamptz not null default now()
);
create index on public.form_fields (form_id, display_order);

-- ---------- FORM_SUBMISSIONS ----------
create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  -- nome de exibição derivado do mapeamento (company_name/contact_name)
  display_name text,
  contact_whatsapp text,
  contact_email text,
  -- atribuição
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,
  landing_url text,
  time_to_fill_seconds integer,
  referrer text,
  ip inet,
  user_agent text,
  session_id text,
  submitted_at timestamptz not null default now()
);
create index on public.form_submissions (form_id, submitted_at desc);
create index on public.form_submissions (form_id, ip, submitted_at desc);
create index on public.form_submissions (fbclid) where fbclid is not null;
create index on public.form_submissions (gclid) where gclid is not null;

-- ---------- FORM_VIEWS ----------
create table public.form_views (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  session_id text not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_step_index integer not null default 0,
  total_steps integer,
  completed boolean not null default false,
  abandoned_at_step integer,
  time_per_step jsonb default '{}'::jsonb,
  validation_errors jsonb default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,
  landing_url text,
  referrer text,
  user_agent text,
  unique (form_id, session_id)
);
create index on public.form_views (form_id, started_at desc);
create index on public.form_views (form_id, completed);

-- ---------- FORM_PARTIALS — captura parcial (recuperação ativa) ----------
create table public.form_partials (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  session_id text not null,
  display_name text,
  contact_whatsapp text,
  contact_email text,
  answers jsonb not null default '{}'::jsonb,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  fbclid text, gclid text, landing_url text, referrer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_id, session_id)
);
create index on public.form_partials (form_id, created_at desc);

-- =======================================================================
-- RLS
-- =======================================================================
alter table public.forms             enable row level security;
alter table public.form_fields       enable row level security;
alter table public.form_submissions  enable row level security;
alter table public.form_views        enable row level security;
alter table public.form_partials     enable row level security;

-- Forms: qualquer usuário autenticado lê e gerencia (admin tool de equipe)
create policy "auth read forms" on public.forms for select using (auth.uid() is not null);
create policy "auth write forms" on public.forms for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "auth read form_fields" on public.form_fields for select using (auth.uid() is not null);
create policy "auth write form_fields" on public.form_fields for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "auth read form_submissions" on public.form_submissions for select using (auth.uid() is not null);
create policy "auth read form_views" on public.form_views for select using (auth.uid() is not null);
create policy "auth read form_partials" on public.form_partials for select using (auth.uid() is not null);

-- =======================================================================
-- STORAGE BUCKETS
-- =======================================================================
insert into storage.buckets (id, name, public) values
  ('form-uploads', 'form-uploads', true),
  ('form-assets',  'form-assets',  true)
on conflict (id) do nothing;

-- Uploads do respondente (anon) — bucket form-uploads
drop policy if exists "public read form-uploads" on storage.objects;
create policy "public read form-uploads" on storage.objects
  for select using (bucket_id = 'form-uploads');
drop policy if exists "anon upload form-uploads" on storage.objects;
create policy "anon upload form-uploads" on storage.objects
  for insert with check (bucket_id = 'form-uploads');

-- Assets do admin (hero/logo) — bucket form-assets
drop policy if exists "public read form-assets" on storage.objects;
create policy "public read form-assets" on storage.objects
  for select using (bucket_id = 'form-assets');
drop policy if exists "auth write form-assets" on storage.objects;
create policy "auth write form-assets" on storage.objects
  for insert with check (bucket_id = 'form-assets' and auth.uid() is not null);
drop policy if exists "auth update form-assets" on storage.objects;
create policy "auth update form-assets" on storage.objects
  for update using (bucket_id = 'form-assets' and auth.uid() is not null);
drop policy if exists "auth delete form-assets" on storage.objects;
create policy "auth delete form-assets" on storage.objects
  for delete using (bucket_id = 'form-assets' and auth.uid() is not null);

-- =======================================================================
-- RPC: get_public_form — carrega o form público por slug
-- =======================================================================
create or replace function public.get_public_form(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_form public.forms%rowtype;
  v_fields jsonb;
begin
  select * into v_form from public.forms where slug = p_slug and active = true;
  if not found then return null; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'form_id', f.form_id,
      'field_type', f.field_type,
      'label', f.label,
      'description', f.description,
      'placeholder', f.placeholder,
      'required', f.required,
      'options', f.options,
      'display_order', f.display_order,
      'validation_regex', f.validation_regex,
      'min_value', f.min_value,
      'max_value', f.max_value,
      'field_mapping', f.field_mapping
    ) order by f.display_order
  ), '[]'::jsonb) into v_fields
  from public.form_fields f where f.form_id = v_form.id;

  return jsonb_build_object(
    'id', v_form.id,
    'slug', v_form.slug,
    'name', v_form.name,
    'description', v_form.description,
    'welcome_eyebrow', v_form.welcome_eyebrow,
    'welcome_title', v_form.welcome_title,
    'welcome_subtitle', v_form.welcome_subtitle,
    'welcome_button_text', v_form.welcome_button_text,
    'welcome_bullets', v_form.welcome_bullets,
    'thank_you_title', v_form.thank_you_title,
    'thank_you_message', v_form.thank_you_message,
    'redirect_url', v_form.redirect_url,
    'welcome_layout', v_form.welcome_layout,
    'hero_image_url', v_form.hero_image_url,
    'hero_video_url', v_form.hero_video_url,
    'logo_url', v_form.logo_url,
    'primary_color', v_form.primary_color,
    'background_gradient', v_form.background_gradient,
    'social_proof_logos', v_form.social_proof_logos,
    'testimonial', v_form.testimonial,
    'hero_stat', v_form.hero_stat,
    'fields', v_fields
  );
end $$;
grant execute on function public.get_public_form(text) to anon, authenticated;

-- =======================================================================
-- RPC: track_form_view — registra views + progressão (upsert por sessão)
-- =======================================================================
create or replace function public.track_form_view(
  p_slug text,
  p_session_id text,
  p_step_index integer,
  p_total_steps integer,
  p_user_agent text default null,
  p_referrer text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_fbclid text default null,
  p_gclid text default null,
  p_landing_url text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_form_id uuid;
begin
  select id into v_form_id from public.forms where slug = p_slug and active = true;
  if v_form_id is null then return; end if;

  insert into public.form_views (
    form_id, session_id, last_step_index, total_steps,
    user_agent, referrer,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbclid, gclid, landing_url, last_seen_at
  ) values (
    v_form_id, p_session_id, p_step_index, p_total_steps,
    p_user_agent, p_referrer,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_fbclid, p_gclid, p_landing_url, now()
  )
  on conflict (form_id, session_id) do update set
    last_step_index = greatest(public.form_views.last_step_index, p_step_index),
    total_steps  = excluded.total_steps,
    fbclid       = coalesce(public.form_views.fbclid, excluded.fbclid),
    gclid        = coalesce(public.form_views.gclid, excluded.gclid),
    landing_url  = coalesce(public.form_views.landing_url, excluded.landing_url),
    utm_source   = coalesce(public.form_views.utm_source, excluded.utm_source),
    utm_medium   = coalesce(public.form_views.utm_medium, excluded.utm_medium),
    utm_campaign = coalesce(public.form_views.utm_campaign, excluded.utm_campaign),
    utm_content  = coalesce(public.form_views.utm_content, excluded.utm_content),
    utm_term     = coalesce(public.form_views.utm_term, excluded.utm_term),
    last_seen_at = now();
end $$;
grant execute on function public.track_form_view(text, text, integer, integer, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- =======================================================================
-- RPC: update_form_step_metrics — tempo por step + erros de validação
-- =======================================================================
create or replace function public.update_form_step_metrics(
  p_slug text,
  p_session_id text,
  p_step_index integer default null,
  p_time_ms integer default null,
  p_validation_error_field_id text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_form_id uuid;
  v_existing_errors jsonb;
  v_existing_count int;
begin
  select id into v_form_id from public.forms where slug = p_slug;
  if v_form_id is null then return; end if;

  if p_step_index is not null and p_time_ms is not null then
    update public.form_views
    set time_per_step = coalesce(time_per_step, '{}'::jsonb) ||
        jsonb_build_object(p_step_index::text, p_time_ms),
        last_seen_at = now()
    where form_id = v_form_id and session_id = p_session_id;
  end if;

  if p_validation_error_field_id is not null then
    select coalesce(validation_errors, '{}'::jsonb) into v_existing_errors
      from public.form_views
      where form_id = v_form_id and session_id = p_session_id;
    v_existing_count := coalesce((v_existing_errors->>p_validation_error_field_id)::int, 0);
    update public.form_views
    set validation_errors = coalesce(validation_errors, '{}'::jsonb) ||
        jsonb_build_object(p_validation_error_field_id, v_existing_count + 1)
    where form_id = v_form_id and session_id = p_session_id;
  end if;
end $$;
grant execute on function public.update_form_step_metrics(text, text, integer, integer, text) to anon, authenticated;

-- =======================================================================
-- RPC: mark_form_abandoned — beacon ao fechar a aba
-- =======================================================================
create or replace function public.mark_form_abandoned(
  p_slug text, p_session_id text, p_step_index integer
) returns void language plpgsql security definer set search_path = public as $$
declare v_form_id uuid;
begin
  select id into v_form_id from public.forms where slug = p_slug;
  if v_form_id is null then return; end if;
  update public.form_views
  set abandoned_at_step = p_step_index, last_seen_at = now()
  where form_id = v_form_id and session_id = p_session_id and not completed;
end $$;
grant execute on function public.mark_form_abandoned(text, text, integer) to anon, authenticated;

-- =======================================================================
-- helper: extrai display_name / whatsapp / email das respostas via mapping
-- =======================================================================
create or replace function public.form_extract_identity(
  p_form_id uuid, p_answers jsonb,
  out display_name text, out contact_whatsapp text, out contact_email text
) language plpgsql security definer set search_path = public as $$
declare
  v_field record;
  v_value text;
  v_company_name text;
  v_contact_name text;
begin
  for v_field in
    select id, field_mapping from public.form_fields
    where form_id = p_form_id order by display_order
  loop
    v_value := null;
    if p_answers ? v_field.id::text then
      if jsonb_typeof(p_answers -> v_field.id::text) = 'array' then
        select string_agg(coalesce(elem ->> 'label', elem #>> '{}'), ', ') into v_value
        from jsonb_array_elements(p_answers -> v_field.id::text) elem;
      elsif jsonb_typeof(p_answers -> v_field.id::text) = 'object' then
        v_value := coalesce(p_answers #>> ARRAY[v_field.id::text, 'label'], p_answers #>> ARRAY[v_field.id::text, 'value']);
      else
        v_value := p_answers ->> v_field.id::text;
      end if;
    end if;
    if v_value is null or v_value = '' then continue; end if;
    case v_field.field_mapping
      when 'company_name'     then v_company_name := v_value;
      when 'contact_name'     then v_contact_name := v_value;
      when 'contact_email'    then contact_email := v_value;
      when 'contact_whatsapp' then contact_whatsapp := v_value;
      else null;
    end case;
  end loop;
  display_name := coalesce(v_company_name, v_contact_name);
end $$;

-- =======================================================================
-- RPC: upsert_partial_lead — captura parcial (só guarda, sem CRM)
-- =======================================================================
create or replace function public.upsert_partial_lead(
  p_slug text, p_session_id text, p_answers jsonb,
  p_user_agent text default null, p_referrer text default null,
  p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_content text default null,
  p_utm_term text default null, p_fbclid text default null,
  p_gclid text default null, p_landing_url text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_form public.forms%rowtype;
  v_name text; v_whats text; v_email text;
begin
  select * into v_form from public.forms where slug = p_slug and active = true;
  if not found then raise exception 'Form not found or inactive'; end if;

  select display_name, contact_whatsapp, contact_email
    into v_name, v_whats, v_email
    from public.form_extract_identity(v_form.id, p_answers);

  -- regra original: parcial só nasce com telefone preenchido
  if v_whats is null or v_whats = '' then
    return jsonb_build_object('error', 'phone_required');
  end if;

  insert into public.form_partials (
    form_id, session_id, display_name, contact_whatsapp, contact_email, answers,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbclid, gclid, landing_url, referrer, updated_at
  ) values (
    v_form.id, p_session_id, coalesce(v_name, 'Lead parcial'), v_whats, v_email, p_answers,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_fbclid, p_gclid, p_landing_url, p_referrer, now()
  )
  on conflict (form_id, session_id) do update set
    display_name = coalesce(excluded.display_name, public.form_partials.display_name),
    contact_whatsapp = excluded.contact_whatsapp,
    contact_email = coalesce(excluded.contact_email, public.form_partials.contact_email),
    answers = excluded.answers,
    updated_at = now();

  return jsonb_build_object('ok', true, 'is_partial', true);
end $$;
grant execute on function public.upsert_partial_lead(text, text, jsonb, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- =======================================================================
-- RPC: submit_form_response — salva a resposta (sem criar lead no CRM)
-- =======================================================================
create or replace function public.submit_form_response(
  p_slug text, p_session_id text, p_answers jsonb,
  p_user_agent text default null, p_referrer text default null,
  p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_content text default null,
  p_utm_term text default null, p_fbclid text default null,
  p_gclid text default null, p_landing_url text default null,
  p_honeypot text default null, p_time_to_fill_seconds integer default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_form public.forms%rowtype;
  v_submission_id uuid;
  v_recent_count integer;
  v_ip inet;
  v_name text; v_whats text; v_email text;
begin
  -- defesas anti-bot (silenciosas: retorna sucesso simulado)
  if p_honeypot is not null and length(trim(p_honeypot)) > 0 then
    return jsonb_build_object('submission_id', null);
  end if;
  if p_time_to_fill_seconds is not null and p_time_to_fill_seconds < 3 then
    return jsonb_build_object('submission_id', null);
  end if;

  select * into v_form from public.forms where slug = p_slug and active = true;
  if not found then raise exception 'Form not found or inactive'; end if;

  -- rate limit: 5/h por IP+form
  v_ip := inet_client_addr();
  if v_ip is not null then
    select count(*) into v_recent_count
    from public.form_submissions
    where form_id = v_form.id and ip = v_ip and submitted_at > now() - interval '1 hour';
    if v_recent_count >= 5 then raise exception 'Rate limit exceeded'; end if;
  end if;

  select display_name, contact_whatsapp, contact_email
    into v_name, v_whats, v_email
    from public.form_extract_identity(v_form.id, p_answers);

  insert into public.form_submissions (
    form_id, answers, display_name, contact_whatsapp, contact_email,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbclid, gclid, landing_url, time_to_fill_seconds,
    referrer, ip, user_agent, session_id
  ) values (
    v_form.id, p_answers, v_name, v_whats, v_email,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_fbclid, p_gclid, p_landing_url, p_time_to_fill_seconds,
    p_referrer, v_ip, p_user_agent, p_session_id
  ) returning id into v_submission_id;

  -- marca a view como concluída
  update public.form_views
  set completed = true, abandoned_at_step = null, last_seen_at = now()
  where form_id = v_form.id and session_id = p_session_id;

  -- limpa o parcial dessa sessão (foi promovido a submission)
  delete from public.form_partials where form_id = v_form.id and session_id = p_session_id;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'redirect_url', v_form.redirect_url,
    'thank_you_title', v_form.thank_you_title,
    'thank_you_message', v_form.thank_you_message
  );
end $$;
grant execute on function public.submit_form_response(text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, integer) to anon, authenticated;

-- =======================================================================
-- RPC: get_form_stats — dashboard acionável (views/conv/dropoff/ads)
-- =======================================================================
create or replace function public.get_form_stats(
  p_form_id uuid, p_days_window integer default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_since timestamptz;
  v_views integer;
  v_completed integer;
  v_submissions integer;
  v_dropoff jsonb;
  v_utm jsonb;
  v_ads_breakdown jsonb;
  v_traffic_source jsonb;
  v_top_ads jsonb;
  v_avg_time numeric;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;

  v_since := case
    when p_days_window is null then '1900-01-01'::timestamptz
    else now() - (p_days_window || ' days')::interval
  end;

  select count(*) into v_views from public.form_views
    where form_id = p_form_id and started_at >= v_since;
  select count(*) into v_completed from public.form_views
    where form_id = p_form_id and started_at >= v_since and completed = true;
  select count(*) into v_submissions from public.form_submissions
    where form_id = p_form_id and submitted_at >= v_since;

  select coalesce(jsonb_agg(jsonb_build_object('step', step_idx, 'count', cnt) order by step_idx), '[]'::jsonb)
  into v_dropoff
  from (
    select last_step_index as step_idx, count(*) as cnt
    from public.form_views
    where form_id = p_form_id and started_at >= v_since and not completed
    group by last_step_index
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object(
    'source', source, 'campaign', campaign, 'views', views, 'conversions', conversions
  ) order by views desc), '[]'::jsonb)
  into v_utm
  from (
    select coalesce(utm_source, '(direct)') as source,
           coalesce(utm_campaign, '(none)') as campaign,
           count(*) as views,
           count(*) filter (where completed) as conversions
    from public.form_views
    where form_id = p_form_id and started_at >= v_since
    group by 1, 2 order by 3 desc limit 20
  ) u;

  select coalesce(jsonb_agg(jsonb_build_object(
    'source', source, 'campaign', campaign, 'content', content, 'term', term,
    'views', views, 'conversions', conversions,
    'conversion_rate', case when views > 0 then round((conversions::numeric / views) * 100, 1) else 0 end
  ) order by conversions desc, views desc), '[]'::jsonb)
  into v_ads_breakdown
  from (
    select coalesce(utm_source, '(direct)') as source,
           coalesce(utm_campaign, '(none)') as campaign,
           coalesce(utm_content, '(none)') as content,
           coalesce(utm_term, '(none)') as term,
           count(*) as views,
           count(*) filter (where completed) as conversions
    from public.form_views
    where form_id = p_form_id and started_at >= v_since
    group by 1, 2, 3, 4 order by 6 desc, 5 desc limit 50
  ) a;

  select jsonb_build_object(
    'meta_submissions',  (select count(*) from public.form_submissions
                          where form_id = p_form_id and submitted_at >= v_since
                          and (fbclid is not null or utm_source ilike 'meta%' or utm_source ilike 'facebook%' or utm_source ilike 'instagram%')),
    'google_submissions',(select count(*) from public.form_submissions
                          where form_id = p_form_id and submitted_at >= v_since
                          and (gclid is not null or utm_source ilike 'google%')),
    'direct_submissions',(select count(*) from public.form_submissions
                          where form_id = p_form_id and submitted_at >= v_since
                          and fbclid is null and gclid is null
                          and (utm_source is null or utm_source not ilike any(array['meta%','facebook%','instagram%','google%']))),
    'meta_views',        (select count(*) from public.form_views
                          where form_id = p_form_id and started_at >= v_since
                          and (fbclid is not null or utm_source ilike 'meta%' or utm_source ilike 'facebook%' or utm_source ilike 'instagram%')),
    'google_views',      (select count(*) from public.form_views
                          where form_id = p_form_id and started_at >= v_since
                          and (gclid is not null or utm_source ilike 'google%')),
    'direct_views',      (select count(*) from public.form_views
                          where form_id = p_form_id and started_at >= v_since
                          and fbclid is null and gclid is null
                          and (utm_source is null or utm_source not ilike any(array['meta%','facebook%','instagram%','google%'])))
  ) into v_traffic_source;

  -- top anúncios — com últimas 3 respostas inline (display_name)
  select coalesce(jsonb_agg(jsonb_build_object(
    'source', source, 'campaign', campaign, 'content', content, 'term', term,
    'submissions', submissions, 'recent_leads', recent_leads
  ) order by submissions desc), '[]'::jsonb)
  into v_top_ads
  from (
    select
      coalesce(fs.utm_source, '(direct)') as source,
      coalesce(fs.utm_campaign, '(none)') as campaign,
      coalesce(fs.utm_content, '(none)') as content,
      coalesce(fs.utm_term, '(none)') as term,
      count(*) as submissions,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'lead_id', sub.id,
          'company_name', coalesce(sub.display_name, '(sem nome)'),
          'submitted_at', sub.submitted_at
        ) order by sub.submitted_at desc), '[]'::jsonb)
        from public.form_submissions sub
        where sub.form_id = p_form_id and sub.submitted_at >= v_since
          and coalesce(sub.utm_source, '(direct)') = coalesce(fs.utm_source, '(direct)')
          and coalesce(sub.utm_campaign, '(none)') = coalesce(fs.utm_campaign, '(none)')
          and coalesce(sub.utm_content, '(none)')  = coalesce(fs.utm_content, '(none)')
          and coalesce(sub.utm_term, '(none)')     = coalesce(fs.utm_term, '(none)')
        limit 3
      ) as recent_leads
    from public.form_submissions fs
    where fs.form_id = p_form_id and fs.submitted_at >= v_since
    group by 1, 2, 3, 4 order by 5 desc limit 15
  ) ads;

  select extract(epoch from avg(last_seen_at - started_at))
  into v_avg_time
  from public.form_views
  where form_id = p_form_id and started_at >= v_since and completed = true;

  return jsonb_build_object(
    'views', v_views,
    'completed', v_completed,
    'submissions', v_submissions,
    'conversion_rate', case when v_views > 0 then round((v_completed::numeric / v_views) * 100, 1) else 0 end,
    'avg_time_seconds', coalesce(round(v_avg_time, 1), 0),
    'dropoff_by_step', v_dropoff,
    'by_utm', v_utm,
    'ads_breakdown', v_ads_breakdown,
    'traffic_source', v_traffic_source,
    'top_ads', v_top_ads,
    'days_window', p_days_window
  );
end $$;
grant execute on function public.get_form_stats(uuid, integer) to authenticated;

-- =======================================================================
-- RPC: clone_form — duplica um form completo com novo slug
-- =======================================================================
create or replace function public.clone_form(
  p_form_id uuid, p_new_slug text, p_new_name text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_new_form_id uuid;
  v_owner uuid;
  v_old_form record;
begin
  v_owner := auth.uid();
  if v_owner is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.forms where slug = p_new_slug) then
    raise exception 'slug já existe: %', p_new_slug;
  end if;
  select * into v_old_form from public.forms where id = p_form_id;
  if not found then raise exception 'form not found: %', p_form_id; end if;

  insert into public.forms (
    slug, name, description, owner_id, active, purpose,
    welcome_eyebrow, welcome_title, welcome_subtitle, welcome_bullets, welcome_button_text,
    welcome_layout, hero_image_url, hero_video_url, logo_url, primary_color,
    background_gradient, social_proof_logos, testimonial, hero_stat,
    thank_you_title, thank_you_message, redirect_url
  ) values (
    p_new_slug,
    coalesce(p_new_name, v_old_form.name || ' (cópia)'),
    v_old_form.description, v_owner, false, v_old_form.purpose,
    v_old_form.welcome_eyebrow, v_old_form.welcome_title, v_old_form.welcome_subtitle,
    v_old_form.welcome_bullets, v_old_form.welcome_button_text,
    v_old_form.welcome_layout, v_old_form.hero_image_url, v_old_form.hero_video_url,
    v_old_form.logo_url, v_old_form.primary_color, v_old_form.background_gradient,
    v_old_form.social_proof_logos, v_old_form.testimonial, v_old_form.hero_stat,
    v_old_form.thank_you_title, v_old_form.thank_you_message, v_old_form.redirect_url
  ) returning id into v_new_form_id;

  insert into public.form_fields (
    form_id, field_type, label, description, placeholder, required,
    options, display_order, validation_regex, min_value, max_value, field_mapping
  )
  select v_new_form_id, field_type, label, description, placeholder, required,
         options, display_order, validation_regex, min_value, max_value, field_mapping
  from public.form_fields where form_id = p_form_id order by display_order;

  return v_new_form_id;
end $$;
grant execute on function public.clone_form(uuid, text, text) to authenticated;
