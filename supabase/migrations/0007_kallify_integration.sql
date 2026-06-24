-- =======================================================================
-- 0007_kallify_integration.sql — Adaptador de leads para o Kallify (CRM)
-- =======================================================================
-- Traduz cada submissão de formulário para o formato que o webhook do
-- Kallify espera ({ form, respondent }) e faz POST pro endpoint do tenant.
--
-- Contrato Kallify (resumo):
--   POST {kallify_webhook_url}            ← URL já inclui o token + ?source=
--   body: {
--     "form": { "form_name": "<nome>" },
--     "respondent": {
--       "respondent_id": "<uuid da submissão>",   -- idempotência
--       "respondent_utms": { utm_source, ... },     -- opcional
--       "raw_answers": [
--         { "question": { "question_type": "name|email|phone|text",
--                         "question_title": "<rótulo>" },
--           "answer": <string | {country,phone>} }
--       ]
--     }
--   }
--
-- Mapeamento (question_type):
--   contact_name     → name   (campo fixo do lead)  ── via NEW.display_name
--   contact_email    → email  (campo fixo do lead)
--   contact_whatsapp → phone  (campo fixo; só dígitos + country "55")
--   QUALQUER OUTRO   → text    (campo personalizado, criado no Kallify)
--                     question_title = rótulo do campo (mantenha estável).
--
-- Idempotência: respondent_id = id da submissão (UUID estável por envio).
--   Reenvio do mesmo id → Kallify responde "duplicate", não duplica.
--
-- Coexiste com o webhook nativo (0006): são triggers independentes na mesma
-- tabela. Um form pode ter webhook_url (nativo), kallify_webhook_url, ambos
-- ou nenhum.
--
-- Segurança: a URL (com o token do tenant) fica na coluna forms.kallify_webhook_url.
--   O role `anon` NÃO lê a tabela forms (RLS exige auth) e get_public_form não
--   expõe essa coluna — o token nunca chega ao front-end.
--
-- Resiliência: o POST é assíncrono (pg_net) e a exception é engolida — uma
--   falha no Kallify nunca derruba a submissão. (pg_net não reenvia sozinho;
--   ver nota de limitação no fim.)
-- =======================================================================

create extension if not exists pg_net;

alter table public.forms
  add column if not exists kallify_webhook_url text;

comment on column public.forms.kallify_webhook_url is
  'URL completa do webhook do Kallify (inclui o token do tenant e o ?source=). '
  'Null = sem integração Kallify. Segredo de servidor: nunca exposto ao anon.';

-- ---------- helper: extrai o valor textual de UMA resposta ----------
-- Mesma regra de form_answers_json / form_extract_identity:
--   array  → join por ", " (usa label de cada item, senão o valor cru)
--   objeto → label, senão value
--   escalar→ valor cru
create or replace function public.form_answer_text(p_answers jsonb, p_field_id uuid)
returns text language sql immutable as $$
  select case
    when p_answers is null or not (p_answers ? p_field_id::text) then null
    when jsonb_typeof(p_answers -> p_field_id::text) = 'array' then (
      select string_agg(coalesce(elem ->> 'label', elem #>> '{}'), ', ')
      from jsonb_array_elements(p_answers -> p_field_id::text) elem
    )
    when jsonb_typeof(p_answers -> p_field_id::text) = 'object' then
      coalesce(p_answers #>> ARRAY[p_field_id::text, 'label'],
               p_answers #>> ARRAY[p_field_id::text, 'value'])
    else p_answers ->> p_field_id::text
  end
$$;

-- ---------- trigger: monta o payload Kallify e dispara o POST ----------
create or replace function public.dispatch_kallify_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_form    public.forms%rowtype;
  v_field   record;
  v_value   text;
  v_answers jsonb := '[]'::jsonb;
  v_digits  text;
  v_phone   text;
  v_payload jsonb;
begin
  select * into v_form from public.forms where id = NEW.form_id;
  if v_form.kallify_webhook_url is null or v_form.kallify_webhook_url = '' then
    return NEW;  -- form sem integração Kallify
  end if;

  -- ----- campos FIXOS -----
  -- name: usa o nome de exibição derivado (company_name ou contact_name).
  if NEW.display_name is not null and NEW.display_name <> '' then
    v_answers := v_answers || jsonb_build_object(
      'question', jsonb_build_object('question_type', 'name', 'question_title', 'Nome'),
      'answer', NEW.display_name
    );
  end if;

  -- email
  if NEW.contact_email is not null and NEW.contact_email <> '' then
    v_answers := v_answers || jsonb_build_object(
      'question', jsonb_build_object('question_type', 'email', 'question_title', 'E-mail'),
      'answer', NEW.contact_email
    );
  end if;

  -- phone: só dígitos + DDI separado. Se vier com 55 na frente (>11 dígitos),
  -- separa o DDI; senão assume Brasil (country "55").
  if NEW.contact_whatsapp is not null and NEW.contact_whatsapp <> '' then
    v_digits := regexp_replace(NEW.contact_whatsapp, '\D', '', 'g');
    if length(v_digits) > 11 and left(v_digits, 2) = '55' then
      v_phone := substring(v_digits from 3);
    else
      v_phone := v_digits;
    end if;
    if v_phone <> '' then
      v_answers := v_answers || jsonb_build_object(
        'question', jsonb_build_object('question_type', 'phone', 'question_title', 'Telefone'),
        'answer', jsonb_build_object('country', '55', 'phone', v_phone)
      );
    end if;
  end if;

  -- ----- campos PERSONALIZADOS (todo o resto) -----
  -- question_title = rótulo do campo (o Kallify deriva a key dele). Mantenha
  -- os rótulos estáveis: renomear cria um campo NOVO no Kallify.
  for v_field in
    select id, label
    from public.form_fields
    where form_id = NEW.form_id
      and coalesce(field_mapping::text, 'note')
          not in ('contact_name', 'contact_email', 'contact_whatsapp')
    order by display_order
  loop
    v_value := public.form_answer_text(NEW.answers, v_field.id);
    if v_value is null or v_value = '' then continue; end if;  -- vazio: ignora
    v_answers := v_answers || jsonb_build_object(
      'question', jsonb_build_object('question_type', 'text', 'question_title', v_field.label),
      'answer', v_value
    );
  end loop;

  -- ----- monta o corpo no formato Kallify -----
  v_payload := jsonb_build_object(
    'form', jsonb_build_object('form_name', v_form.name),
    'respondent', jsonb_build_object(
      'respondent_id', NEW.id,                              -- idempotência
      'respondent_utms', jsonb_strip_nulls(jsonb_build_object(
        'utm_source',   NEW.utm_source,
        'utm_medium',   NEW.utm_medium,
        'utm_campaign', NEW.utm_campaign,
        'utm_content',  NEW.utm_content,
        'utm_term',     NEW.utm_term
      )),
      'raw_answers', v_answers
    )
  );

  -- POST assíncrono (pg_net enfileira; worker entrega). Não bloqueia o insert.
  -- A autenticação é o token embutido na URL (?.../lead/{token}).
  perform net.http_post(
    url     := v_form.kallify_webhook_url,
    body    := v_payload,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 5000
  );

  return NEW;
exception when others then
  -- o adaptador nunca derruba a submissão
  raise warning 'dispatch_kallify_lead falhou: %', sqlerrm;
  return NEW;
end $$;

drop trigger if exists trg_dispatch_kallify_lead on public.form_submissions;
create trigger trg_dispatch_kallify_lead
  after insert on public.form_submissions
  for each row execute function public.dispatch_kallify_lead();

-- ---------- clone_form: passa a copiar kallify_webhook_url ----------
-- (re-declara a versão do 0006 acrescentando a nova coluna)
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
    thank_you_title, thank_you_message, redirect_url,
    whatsapp_number, whatsapp_message, gtm_container_id,
    white_label, font_family, heading_font_family,
    question_color, answer_color, button_color, powered_by_variant,
    webhook_url, webhook_secret, kallify_webhook_url
  ) values (
    p_new_slug,
    coalesce(p_new_name, v_old_form.name || ' (cópia)'),
    v_old_form.description, v_owner, false, v_old_form.purpose,
    v_old_form.welcome_eyebrow, v_old_form.welcome_title, v_old_form.welcome_subtitle,
    v_old_form.welcome_bullets, v_old_form.welcome_button_text,
    v_old_form.welcome_layout, v_old_form.hero_image_url, v_old_form.hero_video_url,
    v_old_form.logo_url, v_old_form.primary_color, v_old_form.background_gradient,
    v_old_form.social_proof_logos, v_old_form.testimonial, v_old_form.hero_stat,
    v_old_form.thank_you_title, v_old_form.thank_you_message, v_old_form.redirect_url,
    v_old_form.whatsapp_number, v_old_form.whatsapp_message, v_old_form.gtm_container_id,
    v_old_form.white_label, v_old_form.font_family, v_old_form.heading_font_family,
    v_old_form.question_color, v_old_form.answer_color, v_old_form.button_color,
    v_old_form.powered_by_variant, v_old_form.webhook_url, v_old_form.webhook_secret,
    v_old_form.kallify_webhook_url
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

-- =======================================================================
-- LIMITAÇÃO CONHECIDA — sem retry automático
-- =======================================================================
-- pg_net é fire-and-forget: se o Kallify responder 500 ou a rede cair, o lead
-- NÃO é reenviado. O contrato Kallify pede retry só em 500/rede (é seguro pela
-- idempotência via respondent_id). Se isso virar problema, a evolução natural
-- é trocar este trigger por uma Edge Function que lê net._http_response e
-- reenfileira em 500/timeout. Mantido simples aqui de propósito.
-- =======================================================================
