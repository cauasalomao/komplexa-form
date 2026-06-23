import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Download, ChevronDown, ChevronRight,
  Search, BarChart3, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { KEyebrow } from "@/components/k/KEyebrow";
import { KCard } from "@/components/k/KCard";
import { KButton } from "@/components/k/KButton";
import { KBadge } from "@/components/k/KBadge";
import { useForm, useFormSubmissions, type FormField, type FormSubmission } from "@/hooks/useForms";
import { cn } from "@/lib/utils";

export default function AdminFormSubmissions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: formData, isLoading: loadingForm } = useForm(id);
  const { data: submissions, isLoading: loadingSubs } = useFormSubmissions(id);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!submissions) return [];
    if (!search.trim()) return submissions;
    const q = search.toLowerCase();
    return submissions.filter((s) => {
      const json = JSON.stringify(s.answers).toLowerCase();
      const name = s.display_name?.toLowerCase() ?? "";
      const utm = `${s.utm_source} ${s.utm_campaign}`.toLowerCase();
      return json.includes(q) || name.includes(q) || utm.includes(q);
    });
  }, [submissions, search]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    if (!formData || !filtered) return;
    try {
      const csv = buildCSV(formData.fields, filtered);
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `submissions-${formData.form.slug}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${filtered.length} submissions exportadas`);
    } catch (e: any) {
      toast.error("Erro ao exportar", { description: e.message });
    }
  };

  if (loadingForm || loadingSubs) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-kblue" />
      </div>
    );
  }

  if (!formData) return <div className="text-[13px] text-kgray">Form não encontrado.</div>;

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
          <KEyebrow>Submissions</KEyebrow>
          <h1 className="text-[22px] mt-1 font-bold text-navy truncate">{formData.form.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <KButton size="sm" variant="outline" onClick={() => navigate(`/admin/forms/${id}/edit`)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </KButton>
          <KButton size="sm" variant="outline" onClick={() => navigate(`/admin/forms/${id}/stats`)}>
            <BarChart3 className="h-3.5 w-3.5" /> Stats
          </KButton>
          <KButton size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" /> Exportar CSV ({filtered.length})
          </KButton>
        </div>
      </div>

      <KCard padding="sm">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-kgray" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nas respostas, lead ou UTM..."
            className="h-9 w-full rounded-[10px] border border-kbdr bg-white pl-9 pr-3 text-[13px] text-navy focus:outline-none focus:ring-2 focus:ring-kblue/30 focus:border-kblue"
          />
        </div>
      </KCard>

      {filtered.length === 0 ? (
        <KCard padding="lg">
          <p className="text-center text-[13px] text-kgray py-6">
            {search ? "Nada bate com a busca." : "Nenhuma submission ainda. Compartilhe o link do form."}
          </p>
        </KCard>
      ) : (
        <KCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-kbg/60">
                <tr className="text-kgray text-[10.5px] uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 w-px"></th>
                  <th className="text-left px-4 py-2.5">Quando</th>
                  <th className="text-left px-4 py-2.5">Identificação</th>
                  <th className="text-left px-4 py-2.5">UTM source</th>
                  <th className="text-left px-4 py-2.5">UTM campaign</th>
                  <th className="text-left px-4 py-2.5">Referrer</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <SubmissionRow
                    key={s.id}
                    submission={s}
                    fields={formData.fields}
                    expanded={expanded.has(s.id)}
                    onToggle={() => toggle(s.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </KCard>
      )}
    </div>
  );
}

function SubmissionRow({
  submission, fields, expanded, onToggle,
}: {
  submission: FormSubmission;
  fields: FormField[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const date = new Date(submission.submitted_at);
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-t border-kbdr hover:bg-kbg/40 cursor-pointer"
      >
        <td className="px-4 py-2.5">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-kgray" />
            : <ChevronRight className="h-3.5 w-3.5 text-kgray" />}
        </td>
        <td className="px-4 py-2.5 text-ktxt">
          <div className="font-semibold text-navy">{date.toLocaleDateString("pt-BR")}</div>
          <div className="text-[10.5px] text-kgray">{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
        </td>
        <td className="px-4 py-2.5">
          {submission.display_name ? (
            <span className="font-semibold text-navy">{submission.display_name}</span>
          ) : (
            <span className="text-kgray italic">—</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          {submission.utm_source ? (
            <KBadge tone="blue">{submission.utm_source}</KBadge>
          ) : <span className="text-kgray text-[12px]">(direct)</span>}
        </td>
        <td className="px-4 py-2.5 text-ktxt">{submission.utm_campaign ?? <span className="text-kgray italic">—</span>}</td>
        <td className="px-4 py-2.5 text-kgray text-[11px] max-w-[220px] truncate">
          {submission.referrer ?? "—"}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-kbg/20 border-t border-kbdr">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 max-w-[1100px]">
              {fields.map((f) => {
                const raw = submission.answers?.[f.id];
                const display = formatAnswer(raw);
                // Renderização especial pra file: link clicável + ícone de download
                const isFile = f.field_type === "file" && raw && typeof raw === "object" && raw.value;
                return (
                  <div key={f.id} className="flex items-baseline gap-3 py-1">
                    <span className="text-[10.5px] uppercase tracking-wider font-bold text-kgray w-44 shrink-0 truncate" title={f.label}>
                      {f.label}
                    </span>
                    {isFile ? (
                      <a
                        href={raw.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={raw.label ?? undefined}
                        className="text-[13px] text-kblue hover:underline inline-flex items-center gap-1.5 break-all"
                      >
                        <Download className="h-3 w-3 shrink-0" />
                        {raw.label ?? "arquivo"}
                      </a>
                    ) : (
                      <span className={cn("text-[13px]", display ? "text-navy" : "text-kgray italic")}>
                        {display ?? "—"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Atribuição completa — visível pra confiar nos dados de origem */}
            {(submission.fbclid || submission.gclid || submission.landing_url || submission.time_to_fill_seconds != null) && (
              <div className="mt-3 pt-3 border-t border-kbdr space-y-1 text-[10.5px] text-kgray">
                {submission.fbclid && (
                  <p className="break-all">
                    <span className="font-bold text-navy uppercase tracking-wider">fbclid:</span> {submission.fbclid}
                  </p>
                )}
                {submission.gclid && (
                  <p className="break-all">
                    <span className="font-bold text-navy uppercase tracking-wider">gclid:</span> {submission.gclid}
                  </p>
                )}
                {submission.landing_url && (
                  <p className="break-all">
                    <span className="font-bold text-navy uppercase tracking-wider">landing url:</span>{" "}
                    <a href={submission.landing_url} target="_blank" rel="noreferrer" className="text-kblue hover:underline">
                      {submission.landing_url}
                    </a>
                  </p>
                )}
                {submission.time_to_fill_seconds != null && (
                  <p>
                    <span className="font-bold text-navy uppercase tracking-wider">tempo de preenchimento:</span>{" "}
                    {submission.time_to_fill_seconds < 60
                      ? `${submission.time_to_fill_seconds}s`
                      : `${Math.floor(submission.time_to_fill_seconds / 60)}m ${submission.time_to_fill_seconds % 60}s`}
                    {submission.time_to_fill_seconds < 10 && (
                      <span className="ml-2 text-warn font-bold">⚠ suspeito (muito rápido)</span>
                    )}
                  </p>
                )}
              </div>
            )}
            {submission.user_agent && (
              <p className="mt-2 text-[10.5px] text-kgray break-all">
                user-agent: {submission.user_agent}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function formatAnswer(raw: any): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (Array.isArray(raw)) {
    return raw.map((v) => (typeof v === "object" && v !== null ? (v.label ?? v.value ?? JSON.stringify(v)) : String(v))).join(", ");
  }
  if (typeof raw === "object") return raw.label ?? raw.value ?? JSON.stringify(raw);
  return String(raw);
}

function csvEscape(v: string): string {
  if (v.includes('"') || v.includes(",") || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildCSV(fields: FormField[], submissions: FormSubmission[]): string {
  const headers = [
    "data",
    "identificacao",
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "fbclid", "gclid", "landing_url",
    "tempo_preenchimento_segundos",
    "referrer",
    ...fields.map((f) => f.label),
  ];
  const rows = submissions.map((s) => {
    const date = new Date(s.submitted_at).toISOString();
    const ident = s.display_name ?? "";
    const utms = [s.utm_source, s.utm_medium, s.utm_campaign, s.utm_content, s.utm_term]
      .map((v) => v ?? "");
    const ads = [s.fbclid ?? "", s.gclid ?? "", s.landing_url ?? ""];
    const timing = s.time_to_fill_seconds != null ? String(s.time_to_fill_seconds) : "";
    const referrer = s.referrer ?? "";
    // Pra arquivo: inclui nome + URL completa no CSV pra RH conseguir baixar
    const answers = fields.map((f) => {
      const raw = s.answers?.[f.id];
      if (f.field_type === "file" && raw && typeof raw === "object" && raw.value) {
        return `${raw.label ?? "arquivo"} <${raw.value}>`;
      }
      return formatAnswer(raw) ?? "";
    });
    return [date, ident, ...utms, ...ads, timing, referrer, ...answers].map(csvEscape).join(",");
  });
  return [headers.map(csvEscape).join(","), ...rows].join("\n");
}
