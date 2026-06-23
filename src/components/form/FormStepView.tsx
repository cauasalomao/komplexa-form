import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, X, Upload, FileText, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { FormField, FormFieldOption } from "@/hooks/useForms";
import {
  maskCPF, maskCNPJ, maskPhone, maskNumber, maskCurrencyBRL,
  parseNumber, parseCurrencyBRL,
  isValidCPF, isValidCNPJ, isValidEmail,
} from "@/lib/formMasks";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type FieldValue = string | number | FormFieldOption | FormFieldOption[] | null;

interface Props {
  field: FormField;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  onSubmit: () => void;
  /** Mostra erros — só ativa quando o usuário tenta avançar */
  showError?: boolean;
  /** Texto/ícone do botão final ("Enviar" no último step, "Continuar" no resto) */
  isLastStep?: boolean;
}

/** Validação local: retorna mensagem de erro ou null. */
export function validateField(field: FormField, value: FieldValue): string | null {
  const empty =
    value === null || value === undefined || value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (field.required && empty) return "Esse campo é obrigatório";
  if (empty) return null;

  switch (field.field_type) {
    case "email":
      if (!isValidEmail(String(value))) return "E-mail inválido";
      break;
    case "cpf":
      if (!isValidCPF(String(value))) return "CPF inválido";
      break;
    case "cnpj":
      if (!isValidCNPJ(String(value))) return "CNPJ inválido";
      break;
    case "phone":
      if (String(value).replace(/\D/g, "").length < 10) return "Telefone incompleto";
      break;
    case "range": {
      const n = Number(value);
      if (Number.isNaN(n)) return "Valor inválido";
      if (field.min_value != null && n < Number(field.min_value)) return `Mínimo: ${field.min_value}`;
      if (field.max_value != null && n > Number(field.max_value)) return `Máximo: ${field.max_value}`;
      break;
    }
    case "number": {
      // Mask só permite dígitos, mas faz cinto-e-suspensório.
      const n = parseNumber(String(value));
      if (n === null || Number.isNaN(n)) return "Digite um número";
      if (field.min_value != null && n < Number(field.min_value)) return `Mínimo: ${field.min_value}`;
      if (field.max_value != null && n > Number(field.max_value)) return `Máximo: ${field.max_value}`;
      break;
    }
    case "currency": {
      // Valor em REAIS (não centavos). Mask já garante formato R$ X.XXX,XX.
      const n = parseCurrencyBRL(String(value));
      if (n === null || Number.isNaN(n)) return "Digite um valor";
      if (n <= 0) return "Valor deve ser maior que zero";
      if (field.min_value != null && n < Number(field.min_value)) return `Mínimo: R$ ${field.min_value}`;
      if (field.max_value != null && n > Number(field.max_value)) return `Máximo: R$ ${field.max_value}`;
      break;
    }
  }

  if (field.validation_regex && !empty) {
    try {
      if (!new RegExp(field.validation_regex).test(String(value))) return "Formato inválido";
    } catch { /* regex mal formado: ignora */ }
  }
  return null;
}

export function FormStepView({ field, value, onChange, onSubmit, showError, isLastStep }: Props) {
  // Erro sempre validado pra estado interno; só exibe se showError ou se já passou validação inline
  const errorOnSubmit = showError ? validateField(field, value) : null;

  // Estado interno: tracking se o campo já foi "interagido" (blur ocorreu) — usado pra
  // exibir validação visual em tempo real só após o lead sair do campo
  const [touched, setTouched] = useState(false);
  const liveError = touched ? validateField(field, value) : null;

  // Reset touched quando muda o campo (próxima pergunta)
  useEffect(() => { setTouched(false); }, [field.id]);

  // Status visual: 'ok' (border verde), 'error' (border vermelha), 'neutral'
  const empty = value === null || value === undefined || value === "" ||
    (Array.isArray(value) && value.length === 0);
  const inlineStatus: "ok" | "error" | "neutral" =
    !touched || empty ? "neutral" : liveError ? "error" : "ok";

  // Mensagem de erro a exibir: showError tem prioridade, depois inline
  const displayError = errorOnSubmit || liveError;

  return (
    <div className="w-full max-w-[640px] mx-auto px-5 sm:px-6">
      <div className="text-center sm:text-left">
        <h2 className="text-[22px] sm:text-[28px] leading-tight font-bold text-navy">
          {field.label}
          {field.required && <span className="ml-1 text-kblue">*</span>}
        </h2>
        {field.description && (
          <p className="mt-2 text-[14px] text-ktxt">{field.description}</p>
        )}
      </div>

      <div className="mt-6">
        <FieldInput
          field={field}
          value={value}
          onChange={onChange}
          onEnter={onSubmit}
          onBlur={() => setTouched(true)}
          inlineStatus={inlineStatus}
        />
      </div>

      {/* Feedback inline — verde se válido após blur, vermelho se inválido */}
      {touched && !empty && inlineStatus === "ok" && (
        <p className="mt-2 text-[12px] text-ok inline-flex items-center gap-1">
          <Check className="h-3 w-3" /> Tudo certo
        </p>
      )}
      {displayError && inlineStatus === "error" && (
        <p className="mt-2 text-[12px] text-danger text-center sm:text-left">{displayError}</p>
      )}
      {errorOnSubmit && !displayError && (
        <p className="mt-2 text-[12px] text-danger text-center sm:text-left">{errorOnSubmit}</p>
      )}

      <ContinueHint field={field} onSubmit={onSubmit} value={value} isLastStep={isLastStep} />
    </div>
  );
}

function ContinueHint({
  field, onSubmit, value, isLastStep,
}: { field: FormField; onSubmit: () => void; value: FieldValue; isLastStep?: boolean }) {
  // Tipos com auto-advance: select e yes_no avançam ao clicar
  const autoAdvance = field.field_type === "select" || field.field_type === "yes_no";
  if (autoAdvance) return null;

  // Multi-select e long_text precisam botão visível
  const needsButton =
    field.field_type === "multi_select" ||
    field.field_type === "long_text" ||
    field.field_type === "range";

  const empty =
    value === null || value === undefined || value === "" ||
    (Array.isArray(value) && value.length === 0);

  return (
    <div className="mt-6 flex items-center justify-center sm:justify-start gap-3">
      <button
        type="button"
        onClick={onSubmit}
        disabled={field.required && empty}
        className={cn(
          "h-12 px-6 rounded-[12px] bg-k-grad text-white font-bold text-[14px]",
          "inline-flex items-center gap-2 shadow-sm hover:opacity-95 transition",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {isLastStep ? (
          <>Enviar <Send className="h-4 w-4" /></>
        ) : (
          <>Continuar <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
      {!needsButton && (
        <span className="text-[11px] text-kgray hidden sm:inline">
          ou pressione <kbd className="font-mono bg-kbg border border-kbdr rounded px-1.5 py-0.5">Enter</kbd>
        </span>
      )}
    </div>
  );
}

function FieldInput({
  field, value, onChange, onEnter, onBlur, inlineStatus,
}: {
  field: FormField; value: FieldValue;
  onChange: (v: FieldValue) => void; onEnter: () => void;
  onBlur?: () => void;
  inlineStatus?: "ok" | "error" | "neutral";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // autofocus no mount
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [field.id]);

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    }
  };

  // Auto-advance após blur+ok em campos com validação determinística.
  // Delay 800ms pra lead ver o ✓ verde antes de pular pra próxima.
  const autoAdvanceAfterBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.();
    const target = e.target;
    // Delay + checa de novo se ainda está válido (lead pode ter editado)
    setTimeout(() => {
      if (document.contains(target) && document.activeElement !== target) {
        const fresh = validateField(field, target.value);
        if (!fresh && target.value && target.value.trim() !== "") {
          onEnter();
        }
      }
    }, 800);
  };

  // Border colors por status
  const borderClass =
    inlineStatus === "ok" ? "border-ok focus:border-ok" :
    inlineStatus === "error" ? "border-danger focus:border-danger" :
    "border-kbdr focus:border-kblue";

  const baseInput =
    "w-full h-14 sm:h-16 px-4 text-[18px] sm:text-[20px] text-navy bg-transparent " +
    "border-b-2 focus:outline-none placeholder:text-kgray/60 " +
    "transition-colors " + borderClass;

  switch (field.field_type) {
    case "text":
      return (
        <input
          ref={inputRef}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleEnter}
          onBlur={() => onBlur?.()}
          placeholder={field.placeholder ?? "Digite aqui..."}
          className={baseInput}
          autoComplete="off"
        />
      );

    case "email":
      return (
        <input
          ref={inputRef}
          type="email"
          inputMode="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleEnter}
          onBlur={autoAdvanceAfterBlur}
          placeholder={field.placeholder ?? "voce@email.com"}
          className={baseInput}
          autoComplete="email"
        />
      );

    case "phone":
      return (
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(maskPhone(e.target.value))}
          onKeyDown={handleEnter}
          onBlur={autoAdvanceAfterBlur}
          placeholder={field.placeholder ?? "(11) 91234-5678"}
          className={baseInput}
          autoComplete="tel"
        />
      );

    case "cpf":
      return (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(maskCPF(e.target.value))}
          onKeyDown={handleEnter}
          onBlur={autoAdvanceAfterBlur}
          placeholder="000.000.000-00"
          className={baseInput}
        />
      );

    case "cnpj":
      return (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(maskCNPJ(e.target.value))}
          onKeyDown={handleEnter}
          onBlur={autoAdvanceAfterBlur}
          placeholder="00.000.000/0000-00"
          className={baseInput}
        />
      );

    case "number":
      return (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(maskNumber(e.target.value))}
          onKeyDown={handleEnter}
          onBlur={() => onBlur?.()}
          placeholder={field.placeholder ?? "Ex: 30"}
          className={baseInput}
          autoComplete="off"
        />
      );

    case "currency":
      return (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(maskCurrencyBRL(e.target.value))}
          onKeyDown={handleEnter}
          onBlur={() => onBlur?.()}
          placeholder={field.placeholder ?? "R$ 0,00"}
          className={baseInput}
          autoComplete="off"
        />
      );

    case "meeting_slot":
      // Datetime-local nativo — usuário escolhe data + horário. Salvamos
      // como ISO 8601 com timezone local. Min: agora. Max: 60 dias.
      // Trigger no banco transforma em scheduled_meetings ao submit.
      return (
        <div>
          <input
            ref={inputRef as any}
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleEnter}
            min={new Date().toISOString().slice(0, 16)}
            max={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
            className={baseInput}
            style={{ colorScheme: "light" }}
          />
          <p className="mt-3 text-[12.5px] text-kgray">
            💡 Escolha um dia e horário que funcione melhor. Nossa equipe confirma logo em seguida.
          </p>
        </div>
      );

    case "long_text":
      return (
        <textarea
          ref={textareaRef}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "Conta um pouco..."}
          rows={4}
          className={
            "w-full p-4 text-[16px] sm:text-[17px] text-navy bg-white border border-kbdr rounded-[12px] " +
            "focus:border-kblue focus:outline-none focus:ring-2 focus:ring-kblue/20 placeholder:text-kgray/60 resize-y"
          }
        />
      );

    case "select":
      return (
        <SelectCards
          options={field.options ?? []}
          value={value as FormFieldOption | null}
          onChange={(opt) => { onChange(opt); setTimeout(onEnter, 200); }}
        />
      );

    case "multi_select":
      return (
        <MultiSelectCards
          options={field.options ?? []}
          value={(value as FormFieldOption[]) ?? []}
          onChange={(opts) => onChange(opts)}
        />
      );

    case "yes_no":
      return (
        <YesNoCards
          value={value as FormFieldOption | null}
          onChange={(opt) => { onChange(opt); setTimeout(onEnter, 200); }}
        />
      );

    case "range":
      return (
        <RangeSlider
          value={value == null ? Number(field.min_value ?? 0) : Number(value)}
          min={Number(field.min_value ?? 0)}
          max={Number(field.max_value ?? 100)}
          onChange={(v) => onChange(v)}
        />
      );

    case "file":
      // Upload pro bucket form-uploads. Valor salvo como FormFieldOption:
      // { value: url_pública, label: nome do arquivo } — assim a RPC e o
      // CSV consomem do jeito padrão (label aparece, value é o link).
      return (
        <FileUploadField
          field={field}
          value={value as FormFieldOption | null}
          onChange={onChange}
        />
      );
  }
}

// ---------- File upload ----------
const ALLOWED_FILE_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "txt", "rtf"];
const MAX_FILE_SIZE_MB = 10;

function FileUploadField({
  field, value, onChange,
}: { field: FormField; value: FormFieldOption | null; onChange: (v: FormFieldOption | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Validações client-side
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_FILE_EXT.includes(ext)) {
      toast.error("Formato não aceito", {
        description: `Use: ${ALLOWED_FILE_EXT.join(", ")}`,
      });
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      toast.error("Arquivo muito grande", {
        description: `Máximo ${MAX_FILE_SIZE_MB}MB. O seu tem ${sizeMB.toFixed(1)}MB.`,
      });
      return;
    }

    setUploading(true);
    try {
      // Path único pra evitar colisão. form_id/random_filename.ext
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${field.form_id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("form-uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: publicData } = supabase.storage.from("form-uploads").getPublicUrl(path);
      onChange({ value: publicData.publicUrl, label: file.name });
      toast.success("Anexo enviado");
    } catch (e: any) {
      toast.error("Erro no upload", { description: e?.message });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.rtf"
        onChange={handleFileSelected}
        className="hidden"
      />
      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full p-6 rounded-[12px] border-2 border-dashed border-kbdr bg-white text-center transition-colors",
            "hover:border-kblue hover:bg-kblue/5",
            uploading && "opacity-60 cursor-wait",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-kblue animate-spin mx-auto mb-2" />
              <p className="text-[14px] text-navy font-semibold">Enviando…</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-kgray mx-auto mb-2" />
              <p className="text-[15px] text-navy font-semibold">Selecionar arquivo</p>
              <p className="text-[12px] text-kgray mt-1">
                PDF, DOC, DOCX, JPG, PNG · máx {MAX_FILE_SIZE_MB}MB
              </p>
            </>
          )}
        </button>
      ) : (
        <div className="w-full p-4 rounded-[12px] border border-success/40 bg-success-soft flex items-center gap-3">
          <FileText className="h-6 w-6 text-success shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-navy truncate">{value.label}</p>
            <a
              href={value.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11.5px] text-kblue underline"
            >
              Abrir arquivo
            </a>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="h-8 w-8 rounded-md text-kgray hover:bg-danger-soft hover:text-danger flex items-center justify-center"
            title="Remover anexo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SelectCards({
  options, value, onChange,
}: { options: FormFieldOption[]; value: FormFieldOption | null; onChange: (v: FormFieldOption) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt, idx) => {
        const active = value?.value === opt.value;
        const letter = String.fromCharCode(65 + idx); // A, B, C...
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "group flex items-center gap-3 p-4 rounded-[12px] border text-left transition-all",
              "hover:border-kblue hover:bg-kblue/5 hover:scale-[1.01]",
              active
                ? "border-kblue bg-kblue/5 ring-2 ring-kblue/20"
                : "border-kbdr bg-white"
            )}
          >
            <span className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0 transition-colors",
              active ? "bg-k-grad text-white" : "bg-kbg text-kgray group-hover:bg-kblue/10 group-hover:text-kblue"
            )}>
              {letter}
            </span>
            <span className="text-[14px] sm:text-[15px] font-semibold text-navy flex-1">{opt.label}</span>
            {active && <Check className="h-4 w-4 text-kblue shrink-0" />}
          </button>
        );
      })}
      {options.length === 0 && (
        <p className="text-[12px] text-kgray italic">Nenhuma opção configurada.</p>
      )}
    </div>
  );
}

function MultiSelectCards({
  options, value, onChange,
}: { options: FormFieldOption[]; value: FormFieldOption[]; onChange: (v: FormFieldOption[]) => void }) {
  const toggle = (opt: FormFieldOption) => {
    const exists = value.some((v) => v.value === opt.value);
    onChange(exists ? value.filter((v) => v.value !== opt.value) : [...value, opt]);
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => {
        const active = value.some((v) => v.value === opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-[12px] border text-left transition-all",
              "hover:border-kblue hover:bg-kblue/5",
              active ? "border-kblue bg-kblue/5 ring-2 ring-kblue/20" : "border-kbdr bg-white"
            )}
          >
            <span className={cn(
              "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
              active ? "bg-k-grad border-transparent" : "border-kbdr"
            )}>
              {active && <Check className="h-3 w-3 text-white" />}
            </span>
            <span className="text-[14px] sm:text-[15px] font-semibold text-navy flex-1">{opt.label}</span>
          </button>
        );
      })}
      {options.length === 0 && (
        <p className="text-[12px] text-kgray italic">Nenhuma opção configurada.</p>
      )}
    </div>
  );
}

function YesNoCards({
  value, onChange,
}: { value: FormFieldOption | null; onChange: (v: FormFieldOption) => void }) {
  const yes = { value: "yes", label: "Sim" };
  const no = { value: "no", label: "Não" };
  const isYes = value?.value === "yes";
  const isNo = value?.value === "no";
  return (
    <div className="grid grid-cols-2 gap-3 max-w-[400px] mx-auto">
      <button
        type="button"
        onClick={() => onChange(yes)}
        className={cn(
          "flex flex-col items-center gap-2 p-6 rounded-[12px] border-2 transition-all",
          "hover:border-success hover:bg-success-soft",
          isYes ? "border-success bg-success-soft ring-2 ring-success/20" : "border-kbdr bg-white"
        )}
      >
        <span className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
          isYes ? "bg-success text-white" : "bg-success-soft text-success"
        )}>
          <Check className="h-5 w-5" />
        </span>
        <span className="text-[14px] font-bold text-navy">Sim</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(no)}
        className={cn(
          "flex flex-col items-center gap-2 p-6 rounded-[12px] border-2 transition-all",
          "hover:border-kgray",
          isNo ? "border-kgray bg-kbg ring-2 ring-kgray/20" : "border-kbdr bg-white"
        )}
      >
        <span className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
          isNo ? "bg-kgray text-white" : "bg-kbg text-kgray"
        )}>
          <X className="h-5 w-5" />
        </span>
        <span className="text-[14px] font-bold text-navy">Não</span>
      </button>
    </div>
  );
}

function RangeSlider({
  value, min, max, onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-[48px] sm:text-[60px] font-extrabold k-grad-text leading-none tabular-nums">
          {local}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={local}
        onChange={(e) => { setLocal(Number(e.target.value)); }}
        onMouseUp={() => onChange(local)}
        onTouchEnd={() => onChange(local)}
        onKeyUp={() => onChange(local)}
        className="w-full accent-kblue h-2"
      />
      <div className="flex justify-between text-[11px] text-kgray font-semibold">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
