-- =======================================================================
-- 0004_form_white_label_fonts.sql — White label + fontes por formulário
-- =======================================================================
-- Cada form pode:
--   - white_label: esconder a marca "powered by Komplexa" (e o logo padrão)
--   - font_family: fonte do corpo (Google Fonts, carregada dinamicamente)
--   - heading_font_family: fonte dos títulos (opcional, separada do corpo)
--
-- Cores (primary_color / background_gradient) e logo já existiam (0001).
-- Atualiza get_public_form (retorna os campos) e clone_form (copia tudo).
-- =======================================================================

alter table public.forms
  add column if not exists white_label boolean not null default false,
  add column if not exists font_family text,
  add column if not exists heading_font_family text;

comment on column public.forms.white_label is
  'Se true, esconde a marca "powered by Komplexa" e o logo padrão na página pública.';
comment on column public.forms.font_family is
  'Nome da fonte (Google Fonts) do corpo do form. Ex: "Poppins". Null = Inter (padrão).';
comment on column public.forms.heading_font_family is
  'Nome da fonte (Google Fonts) dos títulos. Null = mesma do corpo.';

-- ---------- get_public_form atualizada ----------
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
    'whatsapp_number', v_form.whatsapp_number,
    'whatsapp_message', v_form.whatsapp_message,
    'welcome_layout', v_form.welcome_layout,
    'hero_image_url', v_form.hero_image_url,
    'hero_video_url', v_form.hero_video_url,
    'logo_url', v_form.logo_url,
    'primary_color', v_form.primary_color,
    'background_gradient', v_form.background_gradient,
    'social_proof_logos', v_form.social_proof_logos,
    'testimonial', v_form.testimonial,
    'hero_stat', v_form.hero_stat,
    'gtm_container_id', v_form.gtm_container_id,
    'white_label', v_form.white_label,
    'font_family', v_form.font_family,
    'heading_font_family', v_form.heading_font_family,
    'fields', v_fields
  );
end $$;
grant execute on function public.get_public_form(text) to anon, authenticated;

-- ---------- clone_form atualizada (copia TODOS os campos novos) ----------
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
    white_label, font_family, heading_font_family
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
    v_old_form.white_label, v_old_form.font_family, v_old_form.heading_font_family
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
