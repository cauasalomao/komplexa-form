-- =======================================================================
-- 0006_form_webhook.sql — Integração com CRM via webhook (push) por form
-- =======================================================================
-- Cada formulário pode ter um webhook_url próprio. Quando uma submissão é
-- registrada, um trigger faz POST (assíncrono, via pg_net) pro endpoint do
-- CRM com o lead mapeado + respostas + atribuição completa.
--
-- Segurança: header X-Webhook-Token = webhook_secret (o CRM compara). Como o
-- POST vai por HTTPS, isso já autentica a origem. (HMAC pode ser adicionado
-- depois se precisar.)
--
-- Resiliência: falha no webhook NÃO quebra a submissão (exception é engolida).
-- Bots não chegam aqui (honeypot/time<3s saem antes do insert).
-- =======================================================================

-- pg_net: extensão da Supabase pra requisições HTTP a partir do Postgres.
create extension if not exists pg_net;

alter table public.forms
  add column if not exists webhook_url text,
  add column if not exists webhook_secret text;

comment on column public.forms.webhook_url is
  'Endpoint do CRM que recebe o POST a cada submissão (push). Null = sem integração.';
comment on column public.forms.webhook_secret is
  'Token enviado no header X-Webhook-Token pro CRM validar a origem. Opcional.';

-- ---------- helper: respostas com labels (array [{field_id,label,value}]) ----------
create or replace function public.form_answers_json(p_form_id uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_field record;
  v_value text;
  v_arr jsonb := '[]'::jsonb;
begin
  for v_field in
    select id, label from public.form_fields where form_id = p_form_id order by display_order
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
    v_arr := v_arr || jsonb_build_object('field_id', v_field.id, 'label', v_field.label, 'value', v_value);
  end loop;
  return v_arr;
end $$;

-- ---------- trigger: dispara o webhook do form a cada submissão ----------
create or replace function public.dispatch_form_webhook()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_form public.forms%rowtype;
  v_payload jsonb;
  v_headers jsonb;
begin
  select * into v_form from public.forms where id = NEW.form_id;
  if v_form.webhook_url is null or v_form.webhook_url = '' then
    return NEW;
  end if;

  v_payload := jsonb_build_object(
    'event', 'form.submitted',
    'submission_id', NEW.id,
    'submitted_at', NEW.submitted_at,
    'form', jsonb_build_object('id', v_form.id, 'slug', v_form.slug, 'name', v_form.name),
    'lead', jsonb_build_object(
      'name', NEW.display_name,
      'email', NEW.contact_email,
      'whatsapp', NEW.contact_whatsapp
    ),
    'answers', public.form_answers_json(NEW.form_id, NEW.answers),
    'attribution', jsonb_build_object(
      'utm_source', NEW.utm_source, 'utm_medium', NEW.utm_medium, 'utm_campaign', NEW.utm_campaign,
      'utm_content', NEW.utm_content, 'utm_term', NEW.utm_term,
      'fbclid', NEW.fbclid, 'gclid', NEW.gclid,
      'landing_url', NEW.landing_url, 'referrer', NEW.referrer
    ),
    'meta', jsonb_build_object(
      'session_id', NEW.session_id,
      'time_to_fill_seconds', NEW.time_to_fill_seconds,
      'user_agent', NEW.user_agent
    )
  );

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'X-Komplexa-Event', 'form.submitted'
  );
  if v_form.webhook_secret is not null and v_form.webhook_secret <> '' then
    v_headers := v_headers || jsonb_build_object('X-Webhook-Token', v_form.webhook_secret);
  end if;

  -- POST assíncrono (pg_net enfileira e um worker processa). Não bloqueia o insert.
  perform net.http_post(
    url := v_form.webhook_url,
    body := v_payload,
    headers := v_headers,
    timeout_milliseconds := 5000
  );

  return NEW;
exception when others then
  -- webhook nunca derruba a submissão
  raise warning 'dispatch_form_webhook falhou: %', sqlerrm;
  return NEW;
end $$;

drop trigger if exists trg_dispatch_form_webhook on public.form_submissions;
create trigger trg_dispatch_form_webhook
  after insert on public.form_submissions
  for each row execute function public.dispatch_form_webhook();

-- ---------- clone_form atualizada (copia webhook_url/secret) ----------
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
    webhook_url, webhook_secret
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
    v_old_form.powered_by_variant, v_old_form.webhook_url, v_old_form.webhook_secret
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
