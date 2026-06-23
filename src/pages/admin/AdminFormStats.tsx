import { useMemo, lazy, Suspense, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Eye, Send, TrendingDown, Clock, Percent,
  Target, ChevronDown, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { KEyebrow } from "@/components/k/KEyebrow";
import { KCard } from "@/components/k/KCard";
import { KMetric } from "@/components/k/KMetric";
import { useForm, useFormStats } from "@/hooks/useForms";
import { cn } from "@/lib/utils";

// Recharts é pesado (~370KB). Lazy load mantém o resto da página instantâneo.
const DropoffChart = lazy(() => import("./_DropoffChart"));

function formatTime(seconds: number): string {
  if (!seconds || seconds < 1) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

type PeriodWindow = null | 7 | 30 | 90;

const PERIOD_OPTIONS: Array<{ value: PeriodWindow; label: string }> = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: null, label: "Tudo" },
];

export default function AdminFormStats() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodWindow>(null);
  const { data: formData, isLoading: loadingForm, error: formError } = useForm(id);
  const { data: stats, isLoading: loadingStats, isFetching, error: statsError, refetch: refetchStats } = useFormStats(id, period);

  const dropoffData = useMemo(() => {
    if (!stats || !formData) return [];
    const fields = formData.fields;
    const map: Record<number, number> = {};
    for (const d of stats.dropoff_by_step ?? []) {
      map[d.step] = d.count;
    }
    return fields.map((f, idx) => ({
      step: idx + 1,
      label: f.label.length > 28 ? f.label.slice(0, 28) + "…" : f.label,
      abandoned: map[idx] ?? 0,
    }));
  }, [stats, formData]);

  if (loadingForm || (loadingStats && !stats)) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-kblue" />
      </div>
    );
  }

  // Erro explícito em vez de "Sem dados" silencioso. Causa mais comum:
  // RPC get_form_stats não foi atualizada (migration 0011 não rodou).
  if (statsError || formError) {
    const err = statsError ?? formError;
    const msg = (err as any)?.message ?? "Erro desconhecido";
    const looksLikeMissingMigration =
      /function .* does not exist/i.test(msg) ||
      /Could not find the function/i.test(msg) ||
      /p_days_window/i.test(msg);
    return (
      <div className="max-w-[640px] py-10">
        <button onClick={() => navigate("/admin/forms")} className="text-kgray hover:text-navy mb-4 inline-flex items-center gap-1.5 text-[13px]">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <KCard padding="lg" className="border-danger bg-danger-soft/30">
          <h2 className="text-[16px] font-bold text-danger">Não consegui carregar as métricas</h2>
          {looksLikeMissingMigration ? (
            <>
              <p className="mt-2 text-[13px] text-navy">
                A RPC <code className="bg-white px-1.5 py-0.5 rounded">get_form_stats</code> está
                desatualizada. Você precisa rodar a <b>migration 0011</b> no Supabase SQL Editor.
              </p>
              <p className="mt-2 text-[12px] text-ktxt">
                Esse erro acontece quando o frontend tenta passar o parâmetro de período (7/30/90 dias)
                pra uma RPC que ainda não conhece esse argumento.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-navy">{msg}</p>
          )}
          <button onClick={() => refetchStats()} className="mt-4 h-10 px-4 rounded-[10px] bg-k-grad text-white font-bold text-[13px]">
            Tentar de novo
          </button>
        </KCard>
      </div>
    );
  }

  if (!formData || !stats) {
    return <div className="text-[13px] text-kgray">Sem dados.</div>;
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate("/admin/forms")}
          className="text-kgray hover:text-navy"
          title="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <KEyebrow>Stats do form</KEyebrow>
          <h1 className="text-[24px] mt-1 font-bold text-navy truncate">{formData.form.name}</h1>
        </div>
        <PeriodPills value={period} onChange={setPeriod} loading={isFetching} />
      </div>

      <TrafficSourceCard stats={stats} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KMetric label="Views" value={stats.views} hint="sessões únicas" />
        <KMetric label="Submissions" value={stats.submissions} />
        <KMetric label="Conversão" value={`${stats.conversion_rate}%`} hint={`${stats.completed} concluíram`} />
        <KMetric label="Tempo médio" value={formatTime(stats.avg_time_seconds)} hint="quem terminou" />
      </div>

      <TopAdsCard stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <KCard padding="md">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-kblue" />
            <h3 className="text-[14px] font-bold text-navy">Drop-off por pergunta</h3>
          </div>
          <p className="text-[11.5px] text-kgray mb-4">
            Quantos pararam em cada pergunta. Picos = perguntas que perdem leads.
          </p>
          {dropoffData.length === 0 ? (
            <p className="text-[12px] text-kgray italic">Sem campos no form.</p>
          ) : (
            <Suspense fallback={
              <div className="h-[260px] flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-kblue" />
              </div>
            }>
              <DropoffChart data={dropoffData} />
            </Suspense>
          )}
        </KCard>

        <AdsBreakdownCard stats={stats} />
      </div>

      <KCard padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-kblue" />
          <h3 className="text-[14px] font-bold text-navy">Funil resumido</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FunnelStep icon={<Eye className="h-3.5 w-3.5" />} label="Abriram" value={stats.views} pct={100} />
          <FunnelStep
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label="Começaram"
            value={Math.max(0, stats.views - (stats.dropoff_by_step.find((d) => d.step === 0)?.count ?? 0))}
            pct={stats.views > 0 ? Math.round(((stats.views - (stats.dropoff_by_step.find((d) => d.step === 0)?.count ?? 0)) / stats.views) * 100) : 0}
          />
          <FunnelStep
            icon={<Send className="h-3.5 w-3.5" />}
            label="Enviaram"
            value={stats.completed}
            pct={stats.views > 0 ? Math.round((stats.completed / stats.views) * 100) : 0}
            highlight
          />
        </div>
      </KCard>
    </div>
  );
}

function PeriodPills({
  value, onChange, loading,
}: { value: PeriodWindow; onChange: (v: PeriodWindow) => void; loading?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1 bg-kbg border border-kbdr rounded-full p-0.5">
      {loading && <Loader2 className="h-3 w-3 animate-spin text-kgray ml-1.5 mr-0.5" />}
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors",
            value === opt.value
              ? "bg-navy text-white"
              : "text-ktxt hover:text-navy"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TrafficSourceCard({ stats }: { stats: NonNullable<ReturnType<typeof useFormStats>["data"]> }) {
  const t = stats.traffic_source;
  if (!t) return null;
  const totalSubs = t.meta_submissions + t.google_submissions + t.direct_submissions;
  const totalViews = t.meta_views + t.google_views + t.direct_views;

  if (totalViews === 0) {
    return (
      <KCard padding="md">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-kblue" />
          <h3 className="text-[14px] font-bold text-navy">Origem do tráfego</h3>
        </div>
        <p className="text-[12px] text-kgray italic">Sem tráfego no período selecionado.</p>
      </KCard>
    );
  }

  return (
    <KCard padding="md">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-kblue" />
          <h3 className="text-[14px] font-bold text-navy">Origem do tráfego</h3>
        </div>
        <p className="text-[10.5px] text-kgray">Meta usa fbclid · Google usa gclid · Direto = sem ID de ad</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SourceChip
          label="Meta"
          color="bg-[#0866FF]"
          submissions={t.meta_submissions}
          views={t.meta_views}
          totalSubs={totalSubs}
          totalViews={totalViews}
        />
        <SourceChip
          label="Google"
          color="bg-[#4285F4]"
          submissions={t.google_submissions}
          views={t.google_views}
          totalSubs={totalSubs}
          totalViews={totalViews}
        />
        <SourceChip
          label="Direto/Outros"
          color="bg-kgray"
          submissions={t.direct_submissions}
          views={t.direct_views}
          totalSubs={totalSubs}
          totalViews={totalViews}
        />
      </div>
    </KCard>
  );
}

function SourceChip({
  label, color, submissions, views, totalSubs, totalViews,
}: {
  label: string; color: string;
  submissions: number; views: number;
  totalSubs: number; totalViews: number;
}) {
  const subsPct = totalSubs > 0 ? Math.round((submissions / totalSubs) * 100) : 0;
  const viewsPct = totalViews > 0 ? Math.round((views / totalViews) * 100) : 0;
  const convRate = views > 0 ? Math.round((submissions / views) * 1000) / 10 : 0;
  return (
    <div className="p-4 rounded-xl border border-kbdr bg-white">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", color)} />
        <span className="text-[12px] font-bold uppercase tracking-wider text-navy">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[28px] font-extrabold text-navy tabular-nums">{submissions}</span>
        <span className="text-[11px] text-kgray">lead{submissions !== 1 ? "s" : ""}</span>
      </div>
      <p className="mt-1 text-[10.5px] text-kgray">
        {subsPct}% dos leads · {views} views ({viewsPct}%) · conv. <span className="font-bold text-kblue">{convRate}%</span>
      </p>
    </div>
  );
}

function AdsBreakdownCard({ stats }: { stats: NonNullable<ReturnType<typeof useFormStats>["data"]> }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Agrupa por source + campaign (nível 1). Drill mostra content + term (nível 2).
  const grouped = useMemo(() => {
    const map = new Map<string, {
      source: string; campaign: string;
      totalViews: number; totalConv: number;
      rows: typeof stats.ads_breakdown;
    }>();
    for (const row of stats.ads_breakdown ?? []) {
      const key = `${row.source}|${row.campaign}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalViews += row.views;
        existing.totalConv += row.conversions;
        existing.rows.push(row);
      } else {
        map.set(key, {
          source: row.source, campaign: row.campaign,
          totalViews: row.views, totalConv: row.conversions,
          rows: [row],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalConv - a.totalConv || b.totalViews - a.totalViews);
  }, [stats.ads_breakdown]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <KCard padding="md">
      <div className="flex items-center gap-2 mb-3">
        <Percent className="h-4 w-4 text-kblue" />
        <h3 className="text-[14px] font-bold text-navy">Conversão por campanha e anúncio</h3>
      </div>
      <p className="text-[11.5px] text-kgray mb-4">
        Click numa campanha pra ver anúncios (utm_content) e públicos (utm_term).
      </p>
      {grouped.length === 0 ? (
        <p className="text-[12px] text-kgray italic">Sem visitas ainda no período.</p>
      ) : (
        <div className="space-y-1.5">
          {grouped.map((g) => {
            const key = `${g.source}|${g.campaign}`;
            const open = expanded.has(key);
            const rate = g.totalViews > 0 ? Math.round((g.totalConv / g.totalViews) * 1000) / 10 : 0;
            const hasDrill = g.rows.length > 1 || g.rows[0]?.content !== "(none)" || g.rows[0]?.term !== "(none)";
            return (
              <div key={key} className="border border-kbdr rounded-md overflow-hidden">
                <button
                  onClick={() => hasDrill && toggle(key)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-[12px] text-left",
                    hasDrill ? "hover:bg-kbg cursor-pointer" : "cursor-default"
                  )}
                >
                  {hasDrill ? (
                    open
                      ? <ChevronDown className="h-3.5 w-3.5 text-kgray shrink-0" />
                      : <ChevronRightIcon className="h-3.5 w-3.5 text-kgray shrink-0" />
                  ) : <span className="w-3.5 h-3.5 shrink-0" />}
                  <span className="font-semibold text-navy">{g.source}</span>
                  <span className="text-kgray">·</span>
                  <span className="text-ktxt truncate flex-1">{g.campaign}</span>
                  <span className="text-[10.5px] text-kgray tabular-nums shrink-0">{g.totalViews} views</span>
                  <span className="text-[10.5px] text-kgray tabular-nums shrink-0">·</span>
                  <span className="text-[10.5px] tabular-nums shrink-0 font-bold text-kblue">{rate}%</span>
                </button>
                {open && hasDrill && (
                  <div className="bg-kbg/40 border-t border-kbdr px-3 py-2">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-kgray text-[9.5px] uppercase tracking-wider">
                          <th className="text-left py-1">Anúncio (utm_content)</th>
                          <th className="text-left py-1">Público (utm_term)</th>
                          <th className="text-right py-1">Views</th>
                          <th className="text-right py-1">Conv.</th>
                          <th className="text-right py-1">Taxa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r, i) => (
                          <tr key={i} className="border-t border-kbdr/40">
                            <td className="py-1.5 text-navy truncate max-w-[200px]" title={r.content}>{r.content}</td>
                            <td className="py-1.5 text-ktxt truncate max-w-[200px]" title={r.term}>{r.term}</td>
                            <td className="py-1.5 text-right tabular-nums">{r.views}</td>
                            <td className="py-1.5 text-right tabular-nums">{r.conversions}</td>
                            <td className="py-1.5 text-right tabular-nums font-bold text-kblue">{r.conversion_rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </KCard>
  );
}

function TopAdsCard({ stats }: { stats: NonNullable<ReturnType<typeof useFormStats>["data"]> }) {
  if (!stats.top_ads || stats.top_ads.length === 0) return null;

  return (
    <KCard padding="md">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-kblue" />
          <h3 className="text-[14px] font-bold text-navy">Top anúncios convertedores</h3>
        </div>
        <p className="text-[10.5px] text-kgray">Últimas respostas por anúncio</p>
      </div>
      <div className="space-y-2">
        {stats.top_ads.slice(0, 6).map((ad, i) => (
          <div key={i} className="border border-kbdr rounded-lg p-3">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11.5px] flex-wrap">
                  <span className="font-bold text-navy">{ad.source}</span>
                  <span className="text-kgray">·</span>
                  <span className="text-ktxt">{ad.campaign}</span>
                  {ad.content !== "(none)" && (
                    <>
                      <span className="text-kgray">·</span>
                      <span className="text-kblue font-semibold">{ad.content}</span>
                    </>
                  )}
                  {ad.term !== "(none)" && (
                    <>
                      <span className="text-kgray">·</span>
                      <span className="text-ktxt italic">{ad.term}</span>
                    </>
                  )}
                </div>
                {ad.recent_leads.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ad.recent_leads.map((lead) => (
                      <span
                        key={lead.lead_id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kbg text-[11px] text-navy"
                      >
                        {lead.company_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[22px] font-extrabold text-navy tabular-nums leading-none">{ad.submissions}</p>
                <p className="text-[10px] text-kgray uppercase tracking-wider">lead{ad.submissions !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </KCard>
  );
}

function FunnelStep({
  icon, label, value, pct, highlight,
}: { icon: React.ReactNode; label: string; value: number; pct: number; highlight?: boolean }) {
  return (
    <div className={highlight ? "k-card bg-gradient-to-br from-kblue/5 to-white" : "k-card"}>
      <div className="flex items-center gap-2 text-kgray text-[11px] uppercase tracking-wider font-semibold">
        {icon} {label}
      </div>
      <div className="mt-2 text-[28px] font-extrabold text-navy tabular-nums">{value}</div>
      <div className="text-[11px] text-kgray">{pct}% das views</div>
    </div>
  );
}
