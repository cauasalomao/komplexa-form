import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Loader2, Trash2, ChevronUp, ChevronDown, Pencil, Check, X,
  Eye, ExternalLink, Copy, Save, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { KEyebrow } from "@/components/k/KEyebrow";
import { KCard } from "@/components/k/KCard";
import { KButton } from "@/components/k/KButton";
import { KInput } from "@/components/k/KInput";
import { KSelect } from "@/components/k/KSelect";
import { KTextarea } from "@/components/k/KTextarea";
import { KModal } from "@/components/k/KModal";
import { KBadge } from "@/components/k/KBadge";
import { FormStepView } from "@/components/form/FormStepView";
import { FormLPSection } from "@/components/form/FormLPSection";
import {
  useForm, useUpdateForm, useUpsertField, useDeleteField, useReorderFields,
  FIELD_TYPE_LABEL, FIELD_MAPPING_LABEL, FORM_FONTS,
  type FormField, type FormFieldType, type FormFieldOption, type FormFieldMapping,
} from "@/hooks/useForms";
import { cn } from "@/lib/utils";

const FIELD_TYPES: FormFieldType[] = [
  "text", "long_text", "email", "phone",
  "number", "currency",
  "select", "multi_select", "yes_no", "range",
  "cpf", "cnpj",
  "meeting_slot", "date",
  "file",
];

export default function AdminFormEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useForm(id);
  const updateForm = useUpdateForm();
  const reorder = useReorderFields();

  const [previewIndex, setPreviewIndex] = useState(0);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [creatingType, setCreatingType] = useState<FormFieldType | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-kblue" />
      </div>
    );
  }

  const { form, fields } = data;
  const previewField = fields[previewIndex];

  const handleMove = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[idx], next[target]] = [next[target], next[idx]];
    try {
      await reorder.mutateAsync({ form_id: form.id, ordered_ids: next.map((f) => f.id) });
      // mantém preview no mesmo campo (que andou junto)
      if (previewIndex === idx) setPreviewIndex(target);
      else if (previewIndex === target) setPreviewIndex(idx);
    } catch (e: any) {
      toast.error("Erro ao reordenar", { description: e.message });
    }
  };

  const togglePublic = async () => {
    try {
      await updateForm.mutateAsync({ id: form.id, active: !form.active });
      toast.success(form.active ? "Form pausado" : "Form ativo");
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    }
  };

  const publicUrl = `${window.location.origin}/f/${form.slug}`;

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/forms")}
          className="text-kgray hover:text-navy"
          title="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <KEyebrow>Editor de form</KEyebrow>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-[22px] font-bold text-navy truncate">{form.name}</h1>
            {form.active ? <KBadge tone="ok">ativo</KBadge> : <KBadge tone="gray">pausado</KBadge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <KButton size="sm" variant="outline" onClick={() => navigate(`/admin/forms/${form.id}/submissions`)}>
            <Eye className="h-3.5 w-3.5" /> Submissions
          </KButton>
          <KButton size="sm" variant="outline" onClick={() => navigate(`/admin/forms/${form.id}/stats`)}>
            <Eye className="h-3.5 w-3.5" /> Stats
          </KButton>
          <KButton size="sm" variant="outline" onClick={() => setEditingMeta(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar telas
          </KButton>
          <KButton size="sm" variant="outline" onClick={togglePublic} loading={updateForm.isPending}>
            {form.active ? "Pausar" : "Ativar"}
          </KButton>
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <KButton size="sm" variant="solid">
              <Eye className="h-3.5 w-3.5" /> Preview real
            </KButton>
          </a>
        </div>
      </div>

      <KCard padding="sm" className="flex items-center gap-2">
        <code className="flex-1 text-[12px] text-ktxt truncate">{publicUrl}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado"); }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-kbdr text-kgray hover:text-kblue hover:border-kblue"
          title="Copiar"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-kbdr text-kgray hover:text-kblue hover:border-kblue"
          title="Abrir"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </KCard>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5">
        {/* Coluna esquerda: lista de campos + add */}
        <div className="space-y-4">
          <KCard padding="md">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-navy uppercase tracking-wider">
                Campos ({fields.length})
              </h3>
              <span className="text-[10.5px] text-kgray">↑↓ pra reordenar</span>
            </div>

            {fields.length === 0 ? (
              <p className="mt-4 text-[12px] text-kgray text-center py-6">
                Nenhum campo. Adiciona o primeiro embaixo.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {fields.map((f, idx) => (
                  <li
                    key={f.id}
                    className={cn(
                      "group flex items-center gap-2 px-2 py-2 rounded-md border transition-colors cursor-pointer",
                      idx === previewIndex
                        ? "border-kblue bg-kblue/5"
                        : "border-transparent hover:bg-kbg"
                    )}
                    onClick={() => setPreviewIndex(idx)}
                  >
                    <span className="text-[10px] text-kgray font-mono w-5 text-right">{idx + 1}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-semibold text-navy truncate">{f.label}</span>
                      <span className="block text-[10px] text-kgray">
                        {FIELD_TYPE_LABEL[f.field_type]}
                        {f.required && " · obrigatório"}
                        {f.field_mapping !== "note" && ` · → ${FIELD_MAPPING_LABEL[f.field_mapping]}`}
                      </span>
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMove(idx, -1); }}
                        disabled={idx === 0}
                        className="h-6 w-6 inline-flex items-center justify-center rounded text-kgray hover:text-navy hover:bg-white disabled:opacity-30"
                        title="Mover pra cima"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMove(idx, 1); }}
                        disabled={idx === fields.length - 1}
                        className="h-6 w-6 inline-flex items-center justify-center rounded text-kgray hover:text-navy hover:bg-white disabled:opacity-30"
                        title="Mover pra baixo"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingField(f); }}
                        className="h-6 w-6 inline-flex items-center justify-center rounded text-kgray hover:text-kblue hover:bg-white"
                        title="Editar"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </KCard>

          <KCard padding="md">
            <h3 className="text-[13px] font-bold text-navy uppercase tracking-wider flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" /> Adicionar campo
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCreatingType(t)}
                  className="px-3 py-2 rounded-md border border-kbdr text-[12px] font-semibold text-navy text-left hover:border-kblue hover:bg-kblue/5 transition-colors"
                >
                  {FIELD_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </KCard>
        </div>

        {/* Coluna direita: preview live */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="k-eyebrow">Preview ao vivo</span>
            {fields.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-kgray">
                <button
                  onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                  disabled={previewIndex === 0}
                  className="h-6 w-6 rounded inline-flex items-center justify-center hover:bg-kbg disabled:opacity-30"
                ><ChevronUp className="h-3 w-3 -rotate-90" /></button>
                {previewIndex + 1} / {fields.length}
                <button
                  onClick={() => setPreviewIndex(Math.min(fields.length - 1, previewIndex + 1))}
                  disabled={previewIndex >= fields.length - 1}
                  className="h-6 w-6 rounded inline-flex items-center justify-center hover:bg-kbg disabled:opacity-30"
                ><ChevronDown className="h-3 w-3 -rotate-90" /></button>
              </div>
            )}
          </div>

          <KCard padding="none" className="overflow-hidden">
            <PreviewFrame form={form} field={previewField} />
          </KCard>
        </div>
      </div>

      {creatingType && (
        <FieldEditorModal
          formId={form.id}
          existingCount={fields.length}
          fieldType={creatingType}
          onClose={() => setCreatingType(null)}
        />
      )}
      {editingField && (
        <FieldEditorModal
          formId={form.id}
          existingField={editingField}
          existingCount={fields.length}
          onClose={() => setEditingField(null)}
        />
      )}
      {editingMeta && (
        <FormMetaModal form={form} fields={fields} onClose={() => setEditingMeta(false)} />
      )}
    </div>
  );
}

function PreviewFrame({
  form, field,
}: {
  form: { welcome_title: string; welcome_subtitle: string | null; welcome_button_text: string };
  field: FormField | undefined;
}) {
  const [previewValue, setPreviewValue] = useState<any>(null);
  useEffect(() => { setPreviewValue(null); }, [field?.id]);

  return (
    <div className="bg-gradient-to-b from-kblue/[0.04] to-white min-h-[520px] flex flex-col">
      <div className="h-1.5 bg-kbg">
        <div className="h-full bg-k-grad" style={{ width: "33%" }} />
      </div>
      <div className="flex-1 flex items-center justify-center py-10">
        {field ? (
          <FormStepView
            field={field}
            value={previewValue}
            onChange={setPreviewValue}
            onSubmit={() => {}}
          />
        ) : (
          <div className="text-center max-w-[520px] px-6">
            <Sparkles className="h-8 w-8 text-kblue mx-auto" />
            <h2 className="mt-4 text-[26px] font-bold text-navy">{form.welcome_title}</h2>
            {form.welcome_subtitle && (
              <p className="mt-2 text-[14px] text-ktxt">{form.welcome_subtitle}</p>
            )}
            <button className="mt-6 h-12 px-7 rounded-[12px] bg-k-grad text-white font-bold text-[14px] shadow-sm">
              {form.welcome_button_text}
            </button>
            <p className="mt-6 text-[11px] text-kgray italic">
              Adiciona um campo na esquerda pra começar a preview da pergunta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldEditorModal({
  formId, existingField, existingCount, fieldType, onClose,
}: {
  formId: string;
  existingField?: FormField;
  existingCount: number;
  fieldType?: FormFieldType;
  onClose: () => void;
}) {
  const upsert = useUpsertField();
  const remove = useDeleteField();
  const isEdit = !!existingField;
  const ft: FormFieldType = existingField?.field_type ?? fieldType!;

  const [label, setLabel] = useState(existingField?.label ?? "");
  const [description, setDescription] = useState(existingField?.description ?? "");
  const [placeholder, setPlaceholder] = useState(existingField?.placeholder ?? "");
  const [required, setRequired] = useState(existingField?.required ?? false);
  const [mapping, setMapping] = useState<FormFieldMapping>(existingField?.field_mapping ?? defaultMappingFor(ft));
  const [options, setOptions] = useState<FormFieldOption[]>(existingField?.options ?? []);
  const [minVal, setMinVal] = useState<string>(existingField?.min_value?.toString() ?? "0");
  const [maxVal, setMaxVal] = useState<string>(existingField?.max_value?.toString() ?? "100");

  const showOptions = ft === "select" || ft === "multi_select";
  const showRange = ft === "range";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Pergunta obrigatória");
      return;
    }
    if (showOptions && options.length === 0) {
      toast.error("Adiciona pelo menos uma opção");
      return;
    }
    try {
      await upsert.mutateAsync({
        ...(existingField ? { id: existingField.id } : {}),
        form_id: formId,
        field_type: ft,
        label: label.trim(),
        description: description.trim() || undefined,
        placeholder: placeholder.trim() || undefined,
        required,
        options: showOptions ? options : [],
        display_order: existingField?.display_order ?? existingCount,
        field_mapping: mapping,
        min_value: showRange ? Number(minVal) : null,
        max_value: showRange ? Number(maxVal) : null,
      } as any);
      toast.success(isEdit ? "Campo atualizado" : "Campo criado");
      onClose();
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleDelete = async () => {
    if (!existingField) return;
    if (!confirm(`Remover "${existingField.label}"?`)) return;
    try {
      await remove.mutateAsync({ id: existingField.id, form_id: formId });
      toast.success("Campo removido");
      onClose();
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  return (
    <KModal open onClose={onClose} title={isEdit ? "Editar campo" : `Novo campo: ${FIELD_TYPE_LABEL[ft]}`} width={620}>
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <KInput label="Pergunta (label)" value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Ex: Qual o nome do hotel?" />
        <KTextarea label="Descrição opcional (mostrada abaixo)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        {!showOptions && ft !== "yes_no" && ft !== "range" && (
          <KInput label="Placeholder" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
        )}

        {showOptions && (
          <OptionsEditor options={options} onChange={setOptions} />
        )}

        {showRange && (
          <div className="grid grid-cols-2 gap-3">
            <KInput type="number" label="Valor mínimo" value={minVal} onChange={(e) => setMinVal(e.target.value)} />
            <KInput type="number" label="Valor máximo" value={maxVal} onChange={(e) => setMaxVal(e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <KSelect label="Mapeamento (vira o que no lead?)" value={mapping} onChange={(e) => setMapping(e.target.value as FormFieldMapping)}>
            {(Object.keys(FIELD_MAPPING_LABEL) as FormFieldMapping[]).map((m) => (
              <option key={m} value={m}>{FIELD_MAPPING_LABEL[m]}</option>
            ))}
          </KSelect>
          <label className="flex items-center gap-2 mt-7 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 accent-kblue"
            />
            <span className="text-[13px] font-semibold text-navy">Campo obrigatório</span>
          </label>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-kbdr">
          {isEdit ? (
            <KButton type="button" variant="danger" size="sm" onClick={handleDelete} loading={remove.isPending}>
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </KButton>
          ) : <span />}
          <div className="flex gap-2">
            <KButton type="button" variant="ghost" onClick={onClose}>Cancelar</KButton>
            <KButton type="submit" loading={upsert.isPending}>
              <Save className="h-4 w-4" /> Salvar
            </KButton>
          </div>
        </div>
      </form>
    </KModal>
  );
}

function defaultMappingFor(t: FormFieldType): FormFieldMapping {
  switch (t) {
    case "email": return "contact_email";
    case "phone": return "contact_whatsapp";
    case "meeting_slot": return "meeting_at";
    default: return "note";
  }
}

function OptionsEditor({
  options, onChange,
}: { options: FormFieldOption[]; onChange: (o: FormFieldOption[]) => void }) {
  const [newLabel, setNewLabel] = useState("");

  const add = () => {
    if (!newLabel.trim()) return;
    const value = slugifyOption(newLabel);
    if (options.some((o) => o.value === value)) {
      toast.error("Opção duplicada");
      return;
    }
    onChange([...options, { value, label: newLabel.trim() }]);
    setNewLabel("");
  };

  return (
    <div>
      <p className="k-eyebrow">Opções de resposta</p>
      <div className="mt-2 space-y-1.5">
        {options.map((opt, idx) => (
          <div key={opt.value} className="flex items-center gap-2 group">
            <span className="text-[10px] text-kgray font-mono w-5 text-right">{idx + 1}</span>
            <input
              value={opt.label}
              onChange={(e) => {
                const next = [...options];
                next[idx] = { ...opt, label: e.target.value };
                onChange(next);
              }}
              className="flex-1 h-9 px-3 rounded-md border border-kbdr text-[13px] focus:outline-none focus:border-kblue"
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, i) => i !== idx))}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md text-kgray hover:text-danger hover:bg-danger-soft"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-[11px] text-kgray italic py-2">Nenhuma opção. Adiciona embaixo.</p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Nova opção..."
          className="flex-1 h-9 px-3 rounded-md border border-kbdr text-[13px] focus:outline-none focus:border-kblue"
        />
        <KButton type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </KButton>
      </div>
    </div>
  );
}

function slugifyOption(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

function FormMetaModal({
  form, fields, onClose,
}: {
  fields: FormField[];
  form: {
    id: string;
    welcome_eyebrow: string | null;
    welcome_title: string;
    welcome_subtitle: string | null;
    welcome_button_text: string;
    welcome_bullets: string[] | null;
    thank_you_title: string;
    thank_you_message: string | null;
    redirect_url: string | null;
    whatsapp_number?: string | null;
    whatsapp_message?: string | null;
    description: string | null;
    gtm_container_id?: string | null;
    white_label?: boolean | null;
    font_family?: string | null;
    heading_font_family?: string | null;
    question_color?: string | null;
    answer_color?: string | null;
    button_color?: string | null;
    powered_by_variant?: "blue" | "white" | null;
    webhook_url?: string | null;
    webhook_secret?: string | null;
    kallify_webhook_url?: string | null;
    purpose?: import("@/hooks/useForms").FormPurpose;
    // Sprint 2: LP visual
    welcome_layout?: string | null;
    hero_image_url?: string | null;
    hero_video_url?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    background_gradient?: string | null;
    social_proof_logos?: any;
    testimonial?: any;
    hero_stat?: any;
  };
  onClose: () => void;
}) {
  const upd = useUpdateForm();
  const upsertField = useUpsertField();
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [welcomeEyebrow, setWelcomeEyebrow] = useState(form.welcome_eyebrow ?? "");
  const [welcomeTitle, setWelcomeTitle] = useState(form.welcome_title);
  const [welcomeSubtitle, setWelcomeSubtitle] = useState(form.welcome_subtitle ?? "");
  const [welcomeButton, setWelcomeButton] = useState(form.welcome_button_text);
  const [welcomeBullets, setWelcomeBullets] = useState<string[]>(form.welcome_bullets ?? []);
  const [thankTitle, setThankTitle] = useState(form.thank_you_title);
  const [thankMsg, setThankMsg] = useState(form.thank_you_message ?? "");
  const [redirect, setRedirect] = useState(form.redirect_url ?? "");
  const [whatsNumber, setWhatsNumber] = useState(form.whatsapp_number ?? "");
  const [whatsMsg, setWhatsMsg] = useState(form.whatsapp_message ?? "");
  const [desc, setDesc] = useState(form.description ?? "");
  const [gtmId, setGtmId] = useState(form.gtm_container_id ?? "");
  const [whiteLabel, setWhiteLabel] = useState(form.white_label ?? false);
  const [bodyFont, setBodyFont] = useState(form.font_family ?? "");
  const [headingFont, setHeadingFont] = useState(form.heading_font_family ?? "");
  const [questionColor, setQuestionColor] = useState(form.question_color ?? "");
  const [answerColor, setAnswerColor] = useState(form.answer_color ?? "");
  const [buttonColor, setButtonColor] = useState(form.button_color ?? "");
  const [poweredVariant, setPoweredVariant] = useState<"blue" | "white">(form.powered_by_variant ?? "blue");
  const [webhookUrl, setWebhookUrl] = useState(form.webhook_url ?? "");
  const [webhookSecret, setWebhookSecret] = useState(form.webhook_secret ?? "");
  const [kallifyUrl, setKallifyUrl] = useState(form.kallify_webhook_url ?? "");
  const [purpose, setPurpose] = useState<import("@/hooks/useForms").FormPurpose>(form.purpose ?? "lead");
  // Sprint 2: estado da LP visual mantido em ref pra evitar re-renders chatos
  const [lpState, setLpState] = useState<any>({
    welcome_layout: form.welcome_layout ?? "minimal",
    hero_image_url: form.hero_image_url ?? "",
    hero_video_url: form.hero_video_url ?? "",
    logo_url: form.logo_url ?? "",
    primary_color: form.primary_color ?? "",
    background_gradient: form.background_gradient ?? "",
    social_proof_logos: form.social_proof_logos ?? [],
    testimonial: form.testimonial ?? null,
    hero_stat: form.hero_stat ?? null,
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // GTM: normaliza (uppercase, sem espaços) e valida formato GTM-XXXXXXX
    const gtmClean = gtmId.trim().toUpperCase();
    if (gtmClean && !/^GTM-[A-Z0-9]+$/.test(gtmClean)) {
      toast.error("GTM inválido", { description: "Use o formato GTM-XXXXXXX." });
      return;
    }
    if (webhookUrl.trim() && !/^https?:\/\//i.test(webhookUrl.trim())) {
      toast.error("Webhook inválido", { description: "A URL deve começar com https://" });
      return;
    }
    if (kallifyUrl.trim() && !/^https?:\/\/.+\/api\/webhooks\/lead\//i.test(kallifyUrl.trim())) {
      toast.error("URL do Kallify inválida", {
        description: "Cole a URL completa do webhook (…/api/webhooks/lead/SEU_TOKEN).",
      });
      return;
    }
    try {
      const cleanBullets = welcomeBullets.map((b) => b.trim()).filter(Boolean);
      // Clean LP state — strings vazias viram null
      const cleanLP = {
        welcome_layout: lpState.welcome_layout || "minimal",
        hero_image_url: lpState.hero_image_url?.trim() || null,
        hero_video_url: lpState.hero_video_url?.trim() || null,
        logo_url: lpState.logo_url?.trim() || null,
        primary_color: lpState.primary_color?.trim() || null,
        background_gradient: lpState.background_gradient?.trim() || null,
        social_proof_logos: (lpState.social_proof_logos ?? []).filter((l: any) => l?.logo_url),
        testimonial: lpState.testimonial?.quote ? lpState.testimonial : null,
        hero_stat: lpState.hero_stat?.value && lpState.hero_stat?.label ? lpState.hero_stat : null,
      };
      await upd.mutateAsync({
        id: form.id,
        welcome_eyebrow: welcomeEyebrow.trim() || null,
        welcome_title: welcomeTitle,
        welcome_subtitle: welcomeSubtitle || null,
        welcome_button_text: welcomeButton,
        welcome_bullets: cleanBullets,
        thank_you_title: thankTitle,
        thank_you_message: thankMsg || null,
        redirect_url: redirect || null,
        whatsapp_number: whatsNumber.replace(/\D/g, "") || null,
        whatsapp_message: whatsMsg.trim() || null,
        description: desc || null,
        gtm_container_id: gtmClean || null,
        white_label: whiteLabel,
        font_family: bodyFont || null,
        heading_font_family: headingFont || null,
        question_color: questionColor.trim() || null,
        answer_color: answerColor.trim() || null,
        button_color: buttonColor.trim() || null,
        powered_by_variant: poweredVariant,
        webhook_url: webhookUrl.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
        kallify_webhook_url: kallifyUrl.trim() || null,
        purpose,
        ...cleanLP,
      } as any);
      toast.success("Telas salvas");
      onClose();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    }
  };

  // Modelo "Hotel": cria os campos faltantes (Nome, Check-in, Check-out, E-mail)
  // e JÁ SALVA os textos + a mensagem do WhatsApp com tokens {Rótulo} que a
  // página pública substitui pelas respostas do lead. Persiste na hora (não
  // depende do botão "Salvar") pra garantir que a mensagem dinâmica vá pro ar.
  // O número do WhatsApp é opcional (sem ele, o lead escolhe o contato).
  const HOTEL_WHATS_MSG =
    "Olá, eu me chamo {Nome} e tenho interesse em uma reserva do dia {Check-in} ao dia {Check-out}.";
  const HOTEL_TEXTS = {
    welcome_eyebrow: "RESERVAS",
    welcome_title: "Garanta sua reserva",
    welcome_subtitle: "Preencha em 30 segundos e fale com a gente no WhatsApp.",
    welcome_button_text: "Fazer reserva",
    thank_you_title: "Quase lá!",
    thank_you_message: "Te levamos pro WhatsApp pra confirmar sua reserva.",
  };
  const applyHotelPreset = async () => {
    if (fields.length > 0 && !confirm(
      "Aplicar o modelo Hotel? Os campos que faltarem (Nome, Check-in, Check-out, " +
      "E-mail) serão adicionados e os textos das telas + a mensagem do WhatsApp " +
      "serão salvos automaticamente."
    )) return;
    setApplyingPreset(true);
    try {
      const specs: Array<{
        label: string; field_type: FormFieldType; field_mapping: FormFieldMapping; placeholder?: string;
      }> = [
        { label: "Nome", field_type: "text", field_mapping: "contact_name", placeholder: "Seu nome completo" },
        { label: "Check-in", field_type: "date", field_mapping: "note" },
        { label: "Check-out", field_type: "date", field_mapping: "note" },
        { label: "E-mail", field_type: "email", field_mapping: "contact_email", placeholder: "voce@email.com" },
      ];
      let order = fields.length;
      for (const s of specs) {
        const exists = fields.some((f) => f.label.trim().toLowerCase() === s.label.toLowerCase());
        if (exists) continue;
        await upsertField.mutateAsync({
          form_id: form.id,
          field_type: s.field_type,
          label: s.label,
          field_mapping: s.field_mapping,
          required: true,
          placeholder: s.placeholder ?? null,
          options: [],
          display_order: order++,
        } as any);
      }
      // Persiste a mensagem + textos IMEDIATAMENTE (não espera o "Salvar").
      await upd.mutateAsync({
        id: form.id,
        whatsapp_message: HOTEL_WHATS_MSG,
        ...HOTEL_TEXTS,
      } as any);
      // Reflete no estado local pra UI ficar consistente sem reabrir o modal.
      setWelcomeEyebrow(HOTEL_TEXTS.welcome_eyebrow);
      setWelcomeTitle(HOTEL_TEXTS.welcome_title);
      setWelcomeSubtitle(HOTEL_TEXTS.welcome_subtitle);
      setWelcomeButton(HOTEL_TEXTS.welcome_button_text);
      setThankTitle(HOTEL_TEXTS.thank_you_title);
      setThankMsg(HOTEL_TEXTS.thank_you_message);
      setWhatsMsg(HOTEL_WHATS_MSG);
      toast.success("Modelo Hotel aplicado e salvo", {
        description: "Já vale no form público. Número do WhatsApp é opcional.",
      });
    } catch (e: any) {
      toast.error("Erro ao aplicar modelo", { description: e.message });
    } finally {
      setApplyingPreset(false);
    }
  };

  return (
    <KModal open onClose={onClose} title="Editar telas e visual da LP" width={780}>
      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="rounded-md border border-kblue/30 bg-kblue/5 p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-navy">🏨 Modelo Hotel (reserva)</p>
            <p className="text-[11.5px] text-ktxt mt-0.5 leading-snug">
              Cria os campos <b>Nome, Check-in, Check-out e E-mail</b> e configura o redirecionamento
              pro WhatsApp com a mensagem "Olá, eu me chamo … e tenho interesse em uma reserva do dia …
              ao dia …". Salva na hora e já vale no form público — ao finalizar, o lead
              é levado pro WhatsApp na hora com a mensagem pronta. O número é opcional
              (sem ele, o lead escolhe o contato ao abrir o app).
            </p>
          </div>
          <KButton type="button" variant="outline" size="sm" onClick={applyHotelPreset} loading={applyingPreset}>
            Aplicar modelo
          </KButton>
        </div>

        <KTextarea label="Descrição interna" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />

        <div>
          <p className="k-eyebrow">Tipo do formulário</p>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as import("@/hooks/useForms").FormPurpose)}
            className="mt-2 w-full h-10 px-3 rounded-md border border-kbdr text-[13px] focus:outline-none focus:border-kblue bg-white"
          >
            <option value="lead">Captação de lead — cria lead/company/contact no CRM</option>
            <option value="recruitment">Captação de candidato — NÃO cria lead, notifica admins</option>
            <option value="info">Pesquisa/Info — só guarda respostas, sem notificação especial</option>
          </select>
          <p className="text-[11px] text-kgray mt-1">
            {purpose === "lead" && "Comportamento padrão. Form gera lead novo no CRM ao ser preenchido."}
            {purpose === "recruitment" && "Bom pra vagas. Candidato responde, salva submission e admins recebem 'Novo candidato'. Lucas/SDR não fica sabendo."}
            {purpose === "info" && "Bom pra pesquisa/feedback. Apenas salva resposta — nenhum lead criado, sem notificação."}
          </p>
        </div>

        <div>
          <p className="k-eyebrow">Tela de boas-vindas — texto</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            <KInput
              label="Eyebrow (microcopy acima do título)"
              value={welcomeEyebrow}
              onChange={(e) => setWelcomeEyebrow(e.target.value)}
              placeholder="MÉTODO KOMPLEXA · GERAÇÃO DE DEMANDA"
            />
            <KInput label="Título" value={welcomeTitle} onChange={(e) => setWelcomeTitle(e.target.value)} required />
            <KTextarea label="Subtítulo" value={welcomeSubtitle} onChange={(e) => setWelcomeSubtitle(e.target.value)} rows={2} />
            <BulletsEditor bullets={welcomeBullets} onChange={setWelcomeBullets} />
            <KInput label="Texto do botão" value={welcomeButton} onChange={(e) => setWelcomeButton(e.target.value)} required />
          </div>
        </div>

        {/* Sprint 2: LP visual customization */}
        <div className="pt-3 border-t border-kbdr">
          <p className="k-eyebrow">Tela de boas-vindas — visual</p>
          <p className="text-[11px] text-kgray mt-1 mb-3">
            Layout, cores, imagens, vídeo, social proof, depoimento. Personalize a landing page completa.
          </p>
          <FormLPSection
            formId={form.id}
            initial={{
              welcome_layout: (form.welcome_layout as any) ?? "minimal",
              hero_image_url: form.hero_image_url ?? "",
              hero_video_url: form.hero_video_url ?? "",
              logo_url: form.logo_url ?? "",
              primary_color: form.primary_color ?? "",
              background_gradient: form.background_gradient ?? "",
              social_proof_logos: form.social_proof_logos ?? [],
              testimonial: form.testimonial ?? undefined,
              hero_stat: form.hero_stat ?? undefined,
            }}
            onChange={setLpState}
          />
        </div>

        <div>
          <p className="k-eyebrow">Tela de obrigado</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            <KInput label="Título" value={thankTitle} onChange={(e) => setThankTitle(e.target.value)} required />
            <KTextarea label="Mensagem" value={thankMsg} onChange={(e) => setThankMsg(e.target.value)} rows={2} />
            <KInput label="Redirect URL (opcional, redireciona em 5s)" value={redirect} onChange={(e) => setRedirect(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="pt-3 border-t border-kbdr">
          <p className="k-eyebrow">Botão final → WhatsApp</p>
          <p className="text-[11px] text-kgray mt-1 mb-2">
            Ao enviar o form, o botão final leva o lead pra uma conversa no WhatsApp
            (e redireciona em 5s). Tem prioridade sobre o Redirect URL acima.
            Se deixar o número vazio mas preencher a mensagem, o WhatsApp abre com o texto
            pronto e o lead escolhe o contato.
            <br />
            💡 Na mensagem, use <code className="bg-kbg px-1 rounded">{"{Rótulo}"}</code> pra inserir a
            resposta de um campo (ex.: <code className="bg-kbg px-1 rounded">{"{Nome}"}</code>,{" "}
            <code className="bg-kbg px-1 rounded">{"{Check-in}"}</code>). O texto entre chaves precisa
            ser igual ao rótulo da pergunta; datas saem como DD/MM/AAAA.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <KInput
              label="Número do WhatsApp (com DDI + DDD, só dígitos)"
              value={whatsNumber}
              onChange={(e) => setWhatsNumber(e.target.value)}
              placeholder="5511999998888"
              hint="Ex: 55 (Brasil) + 11 (DDD) + número. Deixe vazio pra não redirecionar pro WhatsApp."
            />
            <KTextarea
              label="Mensagem pré-preenchida (opcional)"
              value={whatsMsg}
              onChange={(e) => setWhatsMsg(e.target.value)}
              rows={2}
              placeholder="Oi! Acabei de preencher o formulário e quero falar com vocês."
            />
          </div>
        </div>

        <div className="pt-3 border-t border-kbdr">
          <p className="k-eyebrow">Cores do formulário</p>
          <p className="text-[11px] text-kgray mt-1 mb-3">
            Cada elemento tem cor própria. Deixe vazio pra usar o padrão. O background fica
            na seção visual acima ("Editar telas" → cores/layout).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ColorField label="Cor da pergunta" value={questionColor} onChange={setQuestionColor} fallback="#0E1E35" />
            <ColorField label="Cor dos campos de resposta" value={answerColor} onChange={setAnswerColor} fallback="#0E1E35" />
            <ColorField label="Cor do botão / destaque" value={buttonColor} onChange={setButtonColor} fallback="#1455F5" />
          </div>
          <p className="text-[11px] text-kgray mt-2">
            💡 Em fundo escuro, use cores claras na pergunta e nos campos pra ter contraste.
          </p>
        </div>

        <div className="pt-3 border-t border-kbdr">
          <p className="k-eyebrow">White label & Fontes</p>
          <p className="text-[11px] text-kgray mt-1 mb-2">
            Logo e background ficam na seção visual acima. Aqui você controla a marca
            Komplexa e as fontes do form.
          </p>
          <label className="flex items-start gap-3 p-3 rounded-md border border-kbdr hover:border-kblue cursor-pointer transition mb-3">
            <input
              type="checkbox"
              checked={whiteLabel}
              onChange={(e) => setWhiteLabel(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-kblue cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-navy">Modo white label</p>
              <p className="text-[11.5px] text-ktxt mt-0.5 leading-snug">
                Esconde o rodapé "powered by Komplexa" e o logo padrão. Use seu próprio logo
                na seção visual acima pra deixar 100% com a sua marca.
              </p>
            </div>
          </label>
          {!whiteLabel && (
            <div className="mb-3">
              <KSelect
                label='Selo "powered by Komplexa"'
                value={poweredVariant}
                onChange={(e) => setPoweredVariant(e.target.value as "blue" | "white")}
              >
                <option value="blue">Azul (fundo claro)</option>
                <option value="white">Branca (fundo escuro)</option>
              </KSelect>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <KSelect label="Fonte do corpo" value={bodyFont} onChange={(e) => setBodyFont(e.target.value)}>
              <option value="">Padrão (Inter)</option>
              {FORM_FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </KSelect>
            <KSelect label="Fonte dos títulos" value={headingFont} onChange={(e) => setHeadingFont(e.target.value)}>
              <option value="">Igual ao corpo</option>
              {FORM_FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </KSelect>
          </div>
          <p className="text-[11px] text-kgray mt-2">
            As fontes são carregadas do Google Fonts na página pública. Veja o resultado no
            <b> Preview real</b>.
          </p>
        </div>

        <div className="pt-3 border-t border-kbdr">
          <p className="k-eyebrow">Rastreamento / GTM</p>
          <p className="text-[11px] text-kgray mt-1 mb-2">
            Cada form pode ter um container GTM próprio. Ele é carregado só na página
            pública do form. No GTM, crie triggers de <b>Custom Event</b> com os nomes{" "}
            <code className="bg-kbg px-1 rounded">lead_complete</code> (envio),{" "}
            <code className="bg-kbg px-1 rounded">lead_partial</code> (telefone preenchido) e{" "}
            <code className="bg-kbg px-1 rounded">pageview</code> — e dispare suas tags de
            GA4 / Meta Pixel / Google Ads.
          </p>
          <KInput
            label="GTM Container ID"
            value={gtmId}
            onChange={(e) => setGtmId(e.target.value)}
            placeholder="GTM-XXXXXXX"
            hint="Deixe vazio pra não carregar nenhum GTM."
          />
        </div>

        <div className="pt-3 border-t border-kbdr">
          <p className="k-eyebrow">Integração / CRM (Kallify)</p>
          <p className="text-[11px] text-kgray mt-1 mb-2">
            Cole a URL completa do webhook do Kallify. Cada submissão vira um lead
            no funil de SDR automaticamente: <b>nome</b>, <b>e-mail</b> e{" "}
            <b>telefone</b> viram os campos fixos do lead; as demais perguntas
            entram como campos personalizados (o título da pergunta vira a chave —
            mantenha os rótulos estáveis). O envio é server-side; o token na URL é
            tratado como segredo e nunca aparece no formulário público.
          </p>
          <KInput
            label="Webhook do Kallify"
            value={kallifyUrl}
            onChange={(e) => setKallifyUrl(e.target.value)}
            placeholder="https://www.kallify.com.br/api/webhooks/lead/SEU_TOKEN?source=site"
            hint="Use ?source=<canal> pra identificar a origem (ex.: ?source=site, ?source=anuncio_meta). Vazio = sem integração."
          />

          <details className="mt-3">
            <summary className="text-[11px] text-kgray cursor-pointer select-none hover:text-navy">
              Webhook genérico (formato nativo Komplexa) — avançado
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-kgray">
                Envia um POST no formato nativo Komplexa (não-Kallify) a cada
                submissão. Use só se você tem um endpoint próprio. Independente do
                Kallify acima — os dois podem estar ativos ao mesmo tempo.
              </p>
              <KInput
                label="URL do webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-endpoint.com/webhook"
                hint="Vazio = desativado."
              />
              <KInput
                label="Token (header X-Webhook-Token)"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="opcional"
                hint="Enviado no header pro seu endpoint validar a origem."
              />
            </div>
          </details>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-kbdr">
          <KButton type="button" variant="ghost" onClick={onClose}>Cancelar</KButton>
          <KButton type="submit" loading={upd.isPending}><Check className="h-4 w-4" /> Salvar</KButton>
        </div>
      </form>
    </KModal>
  );
}

/** Campo de cor: swatch (input type=color) + hex editável + limpar. */
function ColorField({
  label, value, onChange, fallback,
}: { label: string; value: string; onChange: (v: string) => void; fallback: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-navy mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 rounded-md border border-kbdr cursor-pointer bg-white p-0.5"
          title="Escolher cor"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${fallback} (padrão)`}
          className="flex-1 min-w-0 h-9 px-3 rounded-md border border-kbdr text-[13px] focus:outline-none focus:border-kblue"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 h-9 px-2 text-[11px] text-kgray hover:text-danger"
            title="Usar padrão"
          >
            limpar
          </button>
        )}
      </div>
    </div>
  );
}

/** Editor inline de bullets — adicionar, remover, reordenar simples */
function BulletsEditor({ bullets, onChange }: { bullets: string[]; onChange: (b: string[]) => void }) {
  const update = (idx: number, value: string) => {
    const next = [...bullets];
    next[idx] = value;
    onChange(next);
  };
  const remove = (idx: number) => onChange(bullets.filter((_, i) => i !== idx));
  const add = () => onChange([...bullets, ""]);
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= bullets.length) return;
    const next = [...bullets];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div>
      <p className="text-[12px] font-semibold text-navy mb-1.5">Bullets de benefícios (opcional)</p>
      <p className="text-[11px] text-kgray mb-2">Aparecem como lista com check abaixo do subtítulo. Recomendado 3.</p>
      <div className="space-y-1.5">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[11px] text-kgray w-5 text-right tabular-nums">{i + 1}.</span>
            <input
              value={b}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Ex: Como o método é aplicado no seu hotel"
              className="flex-1 h-9 rounded-[8px] border border-kbdr px-3 text-[13px] focus:outline-none focus:border-kblue"
            />
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="h-7 w-7 inline-flex items-center justify-center rounded text-kgray hover:text-navy hover:bg-kbg disabled:opacity-30"
              title="Subir"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === bullets.length - 1}
              className="h-7 w-7 inline-flex items-center justify-center rounded text-kgray hover:text-navy hover:bg-kbg disabled:opacity-30"
              title="Descer"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="h-7 w-7 inline-flex items-center justify-center rounded text-kgray hover:text-danger hover:bg-danger/10"
              title="Remover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 h-8 px-3 rounded-md border border-dashed border-kbdr text-[12px] text-kgray hover:border-kblue hover:text-kblue inline-flex items-center gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar bullet
      </button>
    </div>
  );
}
