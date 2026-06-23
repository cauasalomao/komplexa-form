import { useState } from "react";
import { Plus, X, Upload, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import { KInput } from "@/components/k/KInput";
import { KTextarea } from "@/components/k/KTextarea";
import { KButton } from "@/components/k/KButton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LAYOUT_OPTIONS, type WelcomeLayout, type SocialProofLogo, type Testimonial, type HeroStat } from "@/components/form/welcome-layouts";

const COLOR_PRESETS = [
  { name: "Azul Komplexa", hex: "#1455F5" },
  { name: "Bordô", hex: "#A22041" },
  { name: "Verde", hex: "#10B981" },
  { name: "Roxo", hex: "#8B5CF6" },
  { name: "Laranja", hex: "#F97316" },
  { name: "Preto", hex: "#0E1E35" },
  { name: "Dourado", hex: "#D4AF37" },
  { name: "Cinza neutro", hex: "#64748B" },
];

interface LPState {
  welcome_layout: WelcomeLayout;
  hero_image_url: string;
  hero_video_url: string;
  logo_url: string;
  primary_color: string;
  background_gradient: string;
  social_proof_logos: SocialProofLogo[];
  testimonial: Testimonial;
  hero_stat: HeroStat;
}

interface Props {
  formId: string;
  initial: Partial<LPState>;
  onChange: (state: LPState) => void;
}

export function FormLPSection({ formId, initial, onChange }: Props) {
  const [layout, setLayout] = useState<WelcomeLayout>(
    (initial.welcome_layout as WelcomeLayout) ?? "minimal",
  );
  const [heroImageUrl, setHeroImageUrl] = useState(initial.hero_image_url ?? "");
  const [heroVideoUrl, setHeroVideoUrl] = useState(initial.hero_video_url ?? "");
  const [logoUrl, setLogoUrl] = useState(initial.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(initial.primary_color ?? "");
  const [backgroundGradient, setBackgroundGradient] = useState(initial.background_gradient ?? "");
  const [logos, setLogos] = useState<SocialProofLogo[]>(initial.social_proof_logos ?? []);
  const [testimonial, setTestimonial] = useState<Testimonial>(
    initial.testimonial ?? { quote: "", author_name: "", author_role: "", avatar_url: "" },
  );
  const [heroStat, setHeroStat] = useState<HeroStat>(
    initial.hero_stat ?? { value: "", label: "", sublabel: "" },
  );

  // Notifica parent a cada mudança
  const emit = (overrides?: Partial<LPState>) => {
    const next: LPState = {
      welcome_layout: layout,
      hero_image_url: heroImageUrl,
      hero_video_url: heroVideoUrl,
      logo_url: logoUrl,
      primary_color: primaryColor,
      background_gradient: backgroundGradient,
      social_proof_logos: logos,
      testimonial,
      hero_stat: heroStat,
      ...overrides,
    };
    onChange(next);
  };

  return (
    <div className="space-y-5">
      {/* Layout picker — gallery visual */}
      <div>
        <p className="k-eyebrow">Layout da landing page</p>
        <p className="text-[11px] text-kgray mt-1 mb-3">
          Escolha o modelo visual da primeira página. Você pode trocar quando quiser.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LAYOUT_OPTIONS.map((opt) => {
            const isSelected = layout === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setLayout(opt.key); emit({ welcome_layout: opt.key }); }}
                className={cn(
                  "p-3 rounded-md border-2 text-left transition-all",
                  isSelected ? "border-kblue bg-[var(--tb09)]" : "border-kbdr bg-white hover:border-kblue",
                )}
              >
                <p className={cn("text-[12.5px] font-bold", isSelected ? "text-kblue" : "text-navy")}>
                  {opt.name} {isSelected && "✓"}
                </p>
                <p className="text-[10.5px] text-kgray mt-0.5 leading-tight">
                  {opt.description}
                </p>
                <p className="text-[10px] text-kgray italic mt-1 leading-tight">
                  Bom pra: {opt.bestFor}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cor primária */}
      <div>
        <p className="text-[12px] font-bold text-navy mb-2 inline-flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Cor primária
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              onClick={() => { setPrimaryColor(p.hex); emit({ primary_color: p.hex }); }}
              title={`${p.name} (${p.hex})`}
              className={cn(
                "h-10 rounded-md border-2 transition-all",
                primaryColor === p.hex ? "border-navy scale-110" : "border-kbdr hover:border-navy",
              )}
              style={{ background: p.hex }}
            />
          ))}
        </div>
        <KInput
          label="Cor custom (hex)"
          value={primaryColor}
          onChange={(e) => { setPrimaryColor(e.target.value); emit({ primary_color: e.target.value }); }}
          placeholder="#1455F5"
        />
      </div>

      {/* Logo customizado */}
      <UploadOrUrl
        formId={formId}
        label="Logo customizado (opcional)"
        hint="Sobrepõe o KLogo padrão. Recomendado: PNG transparente, altura ~48px."
        value={logoUrl}
        onChange={(v) => { setLogoUrl(v); emit({ logo_url: v }); }}
      />

      {/* Hero image — só relevante pros layouts que usam */}
      {(layout === "hero_image") && (
        <UploadOrUrl
          formId={formId}
          label="Imagem hero"
          hint="Imagem grande à direita do texto. Recomendado: 1200×900, JPG ou PNG."
          value={heroImageUrl}
          onChange={(v) => { setHeroImageUrl(v); emit({ hero_image_url: v }); }}
        />
      )}

      {/* Hero video — só pra layout hero_video */}
      {layout === "hero_video" && (
        <KInput
          label="URL do vídeo (YouTube ou Vimeo)"
          value={heroVideoUrl}
          onChange={(e) => { setHeroVideoUrl(e.target.value); emit({ hero_video_url: e.target.value }); }}
          placeholder="https://youtube.com/watch?v=..."
          hint="Extraímos o ID automaticamente."
        />
      )}

      {/* Social proof — só pra layout social_proof */}
      {layout === "social_proof" && (
        <SocialProofEditor formId={formId} logos={logos} onChange={(next) => { setLogos(next); emit({ social_proof_logos: next }); }} />
      )}

      {/* Testimonial — só pra layout testimonial */}
      {layout === "testimonial" && (
        <TestimonialEditor
          formId={formId}
          testimonial={testimonial}
          onChange={(next) => { setTestimonial(next); emit({ testimonial: next }); }}
        />
      )}

      {/* Hero stat — só pra layout quiz_stats */}
      {layout === "quiz_stats" && (
        <div className="border border-kbdr rounded-md p-3 space-y-2">
          <p className="text-[12px] font-bold text-navy">Estatística grande</p>
          <KInput label="Valor (ex: 200+)" value={heroStat.value}
            onChange={(e) => { const n = { ...heroStat, value: e.target.value }; setHeroStat(n); emit({ hero_stat: n }); }}
            placeholder="200+" />
          <KInput label="Label (ex: hotéis confiam)" value={heroStat.label}
            onChange={(e) => { const n = { ...heroStat, label: e.target.value }; setHeroStat(n); emit({ hero_stat: n }); }}
            placeholder="hotéis confiam" />
          <KInput label="Sublabel (opcional)" value={heroStat.sublabel ?? ""}
            onChange={(e) => { const n = { ...heroStat, sublabel: e.target.value }; setHeroStat(n); emit({ hero_stat: n }); }}
            placeholder="em todo o Brasil" />
        </div>
      )}

      {/* Background — opcional avançado */}
      <details className="border border-kbdr rounded-md">
        <summary className="px-3 py-2 text-[12px] font-bold text-navy cursor-pointer">
          Background customizado (avançado)
        </summary>
        <div className="p-3 border-t border-kbdr">
          <KInput
            label="CSS gradient ou cor"
            value={backgroundGradient}
            onChange={(e) => { setBackgroundGradient(e.target.value); emit({ background_gradient: e.target.value }); }}
            placeholder="linear-gradient(135deg, #1e1e3f, #2d2d5f) OU #f5f5f5"
            hint="Aplicado ao body inteiro do form."
          />
        </div>
      </details>
    </div>
  );
}

// ============ Upload helper ============
function UploadOrUrl({
  formId, label, hint, value, onChange,
}: {
  formId: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande", { description: "Máximo 5MB" });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "img").toLowerCase();
      const path = `${formId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from("form-assets").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("form-assets").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (err: any) {
      toast.error("Erro no upload", { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-[12px] font-bold text-navy mb-1">{label}</p>
      {hint && <p className="text-[10.5px] text-kgray mb-2">{hint}</p>}
      <div className="flex gap-2 items-stretch">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... ou faz upload"
          className="flex-1 h-9 px-3 text-[13px] rounded-md border border-kbdr focus:border-kblue focus:outline-none"
        />
        <label className="h-9 px-3 inline-flex items-center gap-1 rounded-md border border-kbdr cursor-pointer hover:border-kblue text-[12px]">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Enviando..." : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-kbdr text-kgray hover:text-danger hover:border-danger"
            title="Remover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {value && (
        <div className="mt-2">
          <img src={value} alt="preview" className="max-h-24 rounded border border-kbdr/40" />
        </div>
      )}
    </div>
  );
}

// ============ Social proof editor ============
function SocialProofEditor({ formId, logos, onChange }: { formId: string; logos: SocialProofLogo[]; onChange: (next: SocialProofLogo[]) => void }) {
  const add = () => onChange([...logos, { logo_url: "" }]);
  const update = (i: number, patch: Partial<SocialProofLogo>) => onChange(logos.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const remove = (i: number) => onChange(logos.filter((_, idx) => idx !== i));

  return (
    <div className="border border-kbdr rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold text-navy">Logos de social proof ({logos.length})</p>
        <KButton type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="h-3 w-3" /> Logo
        </KButton>
      </div>
      {logos.length === 0 && (
        <p className="text-[11px] text-kgray italic">Nenhum logo. Adicione clientes/parceiros pra exibir.</p>
      )}
      {logos.map((logo, i) => (
        <div key={i} className="grid grid-cols-[1fr_140px_30px] gap-2 items-start">
          <UploadOrUrl
            formId={formId}
            label={`Logo ${i + 1}`}
            value={logo.logo_url}
            onChange={(url) => update(i, { logo_url: url })}
          />
          <div>
            <p className="text-[11px] font-bold text-navy mb-1">Alt</p>
            <input
              value={logo.alt ?? ""}
              onChange={(e) => update(i, { alt: e.target.value })}
              placeholder="Hotel X"
              className="w-full h-9 px-2 text-[12px] rounded-md border border-kbdr focus:border-kblue focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-danger-soft text-kgray hover:text-danger mt-5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============ Testimonial editor ============
function TestimonialEditor({ formId, testimonial, onChange }: { formId: string; testimonial: Testimonial; onChange: (next: Testimonial) => void }) {
  return (
    <div className="border border-kbdr rounded-md p-3 space-y-3">
      <p className="text-[12px] font-bold text-navy">Depoimento</p>
      <KTextarea label="Quote (frase do cliente)" value={testimonial.quote}
        onChange={(e) => onChange({ ...testimonial, quote: e.target.value })}
        rows={3}
        placeholder="Em 6 meses dobramos nossa ocupação..."
      />
      <div className="grid grid-cols-2 gap-2">
        <KInput label="Nome" value={testimonial.author_name}
          onChange={(e) => onChange({ ...testimonial, author_name: e.target.value })}
          placeholder="Renata Silva" />
        <KInput label="Cargo (opcional)" value={testimonial.author_role ?? ""}
          onChange={(e) => onChange({ ...testimonial, author_role: e.target.value })}
          placeholder="Gerente do Hotel X" />
      </div>
      <UploadOrUrl
        formId={formId}
        label="Foto (opcional)"
        hint="Recomendado: PNG quadrado, ~120px."
        value={testimonial.avatar_url ?? ""}
        onChange={(url) => onChange({ ...testimonial, avatar_url: url })}
      />
    </div>
  );
}
