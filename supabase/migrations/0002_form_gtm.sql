-- =======================================================================
-- 0002_form_gtm.sql — GTM (Google Tag Manager) por formulário
-- =======================================================================
-- Cada form pode ter seu PRÓPRIO container GTM. A página pública (/f/:slug)
-- carrega dinamicamente esse container e dispara os eventos de conversão
-- (lead_complete / lead_partial) no dataLayer daquele container.
--
-- No GTM você cria triggers de "Custom Event" com nomes:
--   - lead_complete  → conversão principal (form enviado)
--   - lead_partial   → conversão intermediária (telefone preenchido)
--   - pageview       → visualização de página (SPA)
-- e dispara as tags de GA4 / Meta Pixel / Google Ads que quiser.
-- =======================================================================

alter table public.forms
  add column if not exists gtm_container_id text;

comment on column public.forms.gtm_container_id is
  'ID do container GTM (formato GTM-XXXXXXX). Carregado só na página pública do form. Null = nenhum GTM.';

-- ---------- get_public_form atualizada (inclui gtm_container_id) ----------
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
    'gtm_container_id', v_form.gtm_container_id,
    'fields', v_fields
  );
end $$;
grant execute on function public.get_public_form(text) to anon, authenticated;
