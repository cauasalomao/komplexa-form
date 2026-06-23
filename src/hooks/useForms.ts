import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FormFieldType =
  | "text" | "long_text" | "email" | "phone"
  | "select" | "multi_select" | "range" | "yes_no"
  | "cpf" | "cnpj"
  | "meeting_slot" // agendamento de call (datetime preferido)
  | "file"         // anexo (PDF/DOC/imagem) — upload pro Storage form-uploads
  | "number"       // inteiro genérico (UHs, qtd, idade) — só dígitos
  | "currency";    // valor monetário em BRL — máscara R$ 1.234,56

export type FormPurpose = "lead" | "recruitment" | "info";

export type FormFieldMapping =
  | "company_name" | "company_city" | "company_state" | "company_uhs" | "company_website"
  | "contact_name" | "contact_role" | "contact_email" | "contact_whatsapp"
  | "note"
  | "meeting_at"; // mapeia pra scheduled_meetings.scheduled_at

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  form_id: string;
  field_type: FormFieldType;
  label: string;
  description: string | null;
  placeholder: string | null;
  required: boolean;
  options: FormFieldOption[];
  display_order: number;
  validation_regex: string | null;
  min_value: number | null;
  max_value: number | null;
  field_mapping: FormFieldMapping;
}

export interface FormRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  welcome_eyebrow: string | null;
  welcome_title: string;
  welcome_subtitle: string | null;
  welcome_button_text: string;
  welcome_bullets: string[] | null;
  thank_you_title: string;
  thank_you_message: string | null;
  redirect_url: string | null;
  /** WhatsApp de redirecionamento ao final (formato internacional, só dígitos). */
  whatsapp_number: string | null;
  /** Mensagem pré-preenchida na conversa do WhatsApp (opcional). */
  whatsapp_message: string | null;
  active: boolean;
  owner_id: string | null;
  /** Migration 0045: define se o form gera lead, capta candidato ou só guarda resposta. */
  purpose: FormPurpose;
  // Sprint 2: LP visual customization (migration 0066)
  welcome_layout?: string | null;
  hero_image_url?: string | null;
  hero_video_url?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  background_gradient?: string | null;
  social_proof_logos?: Array<{ logo_url: string; alt?: string; href?: string }> | null;
  testimonial?: { quote: string; author_name: string; author_role?: string; avatar_url?: string } | null;
  hero_stat?: { value: string; label: string; sublabel?: string } | null;
  /** Container GTM próprio do form (formato GTM-XXXXXXX). Carregado só na página pública. */
  gtm_container_id?: string | null;
  /** White label: esconde a marca "powered by Komplexa" e o logo padrão. */
  white_label?: boolean | null;
  /** Fonte do corpo (Google Fonts). Null = Inter. */
  font_family?: string | null;
  /** Fonte dos títulos (Google Fonts). Null = mesma do corpo. */
  heading_font_family?: string | null;
  created_at: string;
  updated_at: string;
  owner?: { name: string } | null;
  submissions_count?: number;
}

/** Fontes Google curadas pro seletor do admin (corpo e títulos). */
export const FORM_FONTS: string[] = [
  "Inter", "Poppins", "Montserrat", "Roboto", "Lato", "Open Sans",
  "Nunito", "Raleway", "Work Sans", "DM Sans", "Manrope", "Rubik",
  "Playfair Display", "Lora", "Merriweather",
];

export const FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  text: "Texto curto",
  long_text: "Texto longo",
  email: "E-mail",
  phone: "Telefone",
  select: "Seleção única",
  multi_select: "Seleção múltipla",
  range: "Slider numérico",
  yes_no: "Sim / Não",
  cpf: "CPF",
  cnpj: "CNPJ",
  meeting_slot: "📅 Agendar call",
  file: "📎 Anexo (PDF/DOC/imagem)",
  number: "🔢 Número (UHs, qtd, idade)",
  currency: "💵 Valor (R$)",
};

export const FORM_PURPOSE_LABEL: Record<FormPurpose, string> = {
  lead: "Captação de lead (CRM)",
  recruitment: "Captação de candidato (RH)",
  info: "Pesquisa / informativo",
};

export const FORM_PURPOSE_DESC: Record<FormPurpose, string> = {
  lead: "Comportamento padrão. Cria lead, company e contact no CRM.",
  recruitment: "Não cria lead. Salva resposta + notifica admins. Bom pra vagas.",
  info: "Não cria lead. Apenas registra resposta. Bom pra pesquisas/feedback.",
};

export const FIELD_MAPPING_LABEL: Record<FormFieldMapping, string> = {
  company_name: "Nome da empresa/hotel",
  company_city: "Cidade",
  company_state: "Estado (UF)",
  company_uhs: "UHs (qtd)",
  company_website: "Website",
  contact_name: "Nome do contato",
  contact_role: "Cargo",
  contact_email: "E-mail do contato",
  contact_whatsapp: "WhatsApp",
  note: "Anotação geral (notes)",
  meeting_at: "📅 Horário sugerido pra call",
};

export function useForms() {
  return useQuery({
    queryKey: ["forms"],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<FormRow[]> => {
      const { data, error } = await supabase
        .from("forms")
        .select("*, owner:profiles(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (data ?? []).map((f: any) => f.id);
      let counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from("form_submissions")
          .select("form_id")
          .in("form_id", ids);
        counts = (subs ?? []).reduce((acc: Record<string, number>, s: any) => {
          acc[s.form_id] = (acc[s.form_id] ?? 0) + 1;
          return acc;
        }, {});
      }

      return (data ?? []).map((f: any) => ({
        ...f,
        submissions_count: counts[f.id] ?? 0,
      }));
    },
  });
}

export function useForm(id: string | undefined) {
  return useQuery({
    queryKey: ["form", id],
    enabled: !!id,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ form: FormRow; fields: FormField[] }> => {
      const { data: form, error: e1 } = await supabase
        .from("forms").select("*").eq("id", id!).single();
      if (e1) throw e1;
      const { data: fields, error: e2 } = await supabase
        .from("form_fields").select("*").eq("form_id", id!).order("display_order");
      if (e2) throw e2;
      return { form: form as unknown as FormRow, fields: (fields ?? []) as unknown as FormField[] };
    },
  });
}

interface CreateFormPayload {
  slug: string;
  name: string;
  description?: string;
  welcome_title?: string;
  welcome_subtitle?: string;
  welcome_button_text?: string;
  welcome_layout?: string;
  thank_you_title?: string;
  thank_you_message?: string;
  redirect_url?: string;
  owner_id?: string;
}

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFormPayload) => {
      // Cast: tipos gerados do Supabase ainda não conhecem welcome_layout
      // (migration 0066 adicionou a coluna). Mesma estratégia do useUpdateForm.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from("forms").insert(payload as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forms"] }),
  });
}

export function useUpdateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FormRow> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanPatch = patch as any;
      delete cleanPatch.owner;
      delete cleanPatch.submissions_count;
      const { error } = await supabase.from("forms").update(cleanPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["forms"] });
      qc.invalidateQueries({ queryKey: ["form", vars.id] });
    },
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forms"] }),
  });
}

/**
 * Duplica form completo: welcome + fields + thank-you, com novo slug.
 * Cópia entra como inactive=false pra revisão antes de publicar.
 */
export function useCloneForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, new_slug, new_name }: { id: string; new_slug: string; new_name?: string }) => {
      const { data, error } = await (supabase as any).rpc("clone_form", {
        p_form_id: id,
        p_new_slug: new_slug,
        p_new_name: new_name ?? null,
      });
      if (error) throw error;
      return data as string;  // novo form_id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forms"] }),
  });
}

export function useUpsertField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (field: Partial<FormField> & { form_id: string; field_type: FormFieldType; label: string }) => {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("form_fields").upsert(field as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["form", vars.form_id] }),
  });
}

export function useDeleteField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; form_id: string }) => {
      const { error } = await supabase.from("form_fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["form", vars.form_id] }),
  });
}

export function useReorderFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { form_id: string; ordered_ids: string[] }) => {
      const updates = vars.ordered_ids.map((id, idx) =>
        supabase.from("form_fields").update({ display_order: idx }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["form", vars.form_id] }),
  });
}

export interface FormStats {
  views: number;
  completed: number;
  submissions: number;
  conversion_rate: number;
  avg_time_seconds: number;
  dropoff_by_step: Array<{ step: number; count: number }>;
  by_utm: Array<{ source: string; campaign: string; views: number; conversions: number }>;
  ads_breakdown: Array<{
    source: string; campaign: string; content: string; term: string;
    views: number; conversions: number; conversion_rate: number;
  }>;
  traffic_source: {
    meta_submissions: number; google_submissions: number; direct_submissions: number;
    meta_views: number; google_views: number; direct_views: number;
  };
  top_ads: Array<{
    source: string; campaign: string; content: string; term: string;
    submissions: number;
    recent_leads: Array<{ lead_id: string; company_name: string; submitted_at: string }>;
  }>;
  days_window: number | null;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  answers: Record<string, any>;
  /** Nome de exibição derivado do mapeamento (company_name/contact_name). */
  display_name: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  landing_url: string | null;
  time_to_fill_seconds: number | null;
  referrer: string | null;
  user_agent: string | null;
  session_id: string | null;
  submitted_at: string;
}

export function useFormSubmissions(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-submissions", formId],
    enabled: !!formId,
    queryFn: async (): Promise<FormSubmission[]> => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select(`
          id, form_id, answers, display_name, contact_whatsapp, contact_email,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          fbclid, gclid, landing_url, time_to_fill_seconds,
          referrer, user_agent, session_id, submitted_at
        `)
        .eq("form_id", formId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FormSubmission[];
    },
  });
}

export function useFormStats(formId: string | undefined, daysWindow: number | null = null) {
  return useQuery({
    queryKey: ["form-stats", formId, daysWindow],
    enabled: !!formId,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<FormStats> => {
      const { data, error } = await supabase.rpc("get_form_stats", {
        p_form_id: formId!,
        p_days_window: daysWindow,
      });
      if (error) throw error;
      return data as unknown as FormStats;
    },
  });
}
