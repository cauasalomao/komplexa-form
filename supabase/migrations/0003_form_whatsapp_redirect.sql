-- =======================================================================
-- 0003_form_whatsapp_redirect.sql — Redirecionar pro WhatsApp ao final
-- =======================================================================
-- Cada form pode, ao ser enviado, levar o lead pra uma conversa no WhatsApp
-- (número configurável por form, com mensagem pré-preenchida opcional).
--
-- O botão da tela de obrigado e o redirect automático (5s) usam:
--   https://wa.me/<whatsapp_number>?text=<whatsapp_message>
--
-- Precedência: se whatsapp_number existe, ele tem prioridade sobre redirect_url.
-- =======================================================================

alter table public.forms
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_message text;

comment on column public.forms.whatsapp_number is
  'Número do WhatsApp (formato internacional, só dígitos — ex: 5511999998888). Se preenchido, o botão final do form leva pro wa.me deste número. Null = usa redirect_url ou nada.';
comment on column public.forms.whatsapp_message is
  'Mensagem pré-preenchida (opcional) na conversa do WhatsApp ao redirecionar.';

-- ---------- get_public_form atualizada (inclui whatsapp_number/message) ----------
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
    'fields', v_fields
  );
end $$;
grant execute on function public.get_public_form(text) to anon, authenticated;
