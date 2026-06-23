-- =======================================================================
-- 0005_form_granular_colors.sql — Cores separadas: pergunta / campos / botão
-- =======================================================================
-- Antes só existia primary_color (pintava tudo). Agora cada form controla:
--   - question_color: cor do texto das perguntas/títulos
--   - answer_color:   cor do texto dos campos de resposta (inputs + opções)
--   - button_color:   cor dos botões e destaques (seleção, foco, slider)
--
-- primary_color continua existindo como fallback do button_color (compat).
-- Background continua em background_gradient. Tudo opcional.
-- =======================================================================

alter table public.forms
  add column if not exists question_color text,
  add column if not exists answer_color text,
  add column if not exists button_color text,
  -- versão do selo "powered by Komplexa": azul (gradiente) ou branca (pra fundo escuro)
  add column if not exists powered_by_variant text not null default 'blue'
    check (powered_by_variant in ('blue', 'white'));

comment on column public.forms.question_color is 'Cor do texto das perguntas/títulos. Null = padrão (navy).';
comment on column public.forms.answer_color   is 'Cor do texto dos campos de resposta (inputs + opções). Null = padrão (navy).';
comment on column public.forms.button_color   is 'Cor dos botões e destaques (seleção/foco/slider). Null = usa primary_color.';
comment on column public.forms.powered_by_variant is 'Versão do selo "powered by Komplexa": blue (gradiente) ou white (pra fundo escuro). Só aparece quando white_label=false.';

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
    'question_color', v_form.question_color,
    'answer_color', v_form.answer_color,
    'button_color', v_form.button_color,
    'powered_by_variant', v_form.powered_by_variant,
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

-- ---------- clone_form atualizada (copia as 3 cores novas) ----------
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
    question_color, answer_color, button_color, powered_by_variant
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
    v_old_form.powered_by_variant
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
