import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KLogo } from "@/components/k/KLogo";
import { FormStepView, validateField, type FieldValue } from "@/components/form/FormStepView";
import { WelcomeRenderer, type WelcomeLayout } from "@/components/form/welcome-layouts";
import type { FormField } from "@/hooks/useForms";

interface PublicForm {
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
  whatsapp_number?: string | null;
  whatsapp_message?: string | null;
  fields: FormField[];
  // Sprint 2: LP visual customization
  welcome_layout?: string | null;
  hero_image_url?: string | null;
  hero_video_url?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  background_gradient?: string | null;
  social_proof_logos?: any;
  testimonial?: any;
  hero_stat?: any;
  // GTM próprio do form
  gtm_container_id?: string | null;
  // White label + fontes
  white_label?: boolean | null;
  font_family?: string | null;
  heading_font_family?: string | null;
}

/**
 * Carrega uma fonte do Google Fonts dinamicamente (uma vez por fonte).
 * Inter já vem no index.html, então é pulada.
 */
function loadGoogleFont(name?: string | null) {
  if (typeof window === "undefined" || !name) return;
  const family = name.trim();
  if (!family || family === "Inter") return;
  const w = window as any;
  w.__loadedFonts = w.__loadedFonts || {};
  if (w.__loadedFonts[family]) return;
  w.__loadedFonts[family] = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  // encodeURIComponent → "Open%20Sans"; Google espera "Open+Sans"
  const enc = encodeURIComponent(family).replace(/%20/g, "+");
  link.href = `https://fonts.googleapis.com/css2?family=${enc}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

/** Stack de fonte com fallback seguro. */
function fontStack(name?: string | null): string | undefined {
  if (!name || !name.trim()) return undefined;
  return `'${name.trim()}', Inter, system-ui, sans-serif`;
}

/**
 * Injeta o container GTM do form dinamicamente (uma vez por container).
 * Cada form pode ter um GTM diferente — por isso não fica hardcoded no
 * index.html. O snippet inicializa window.dataLayer, então os eventos de
 * conversão (lead_complete / lead_partial) já empurrados são capturados
 * pelo GTM assim que ele carrega.
 */
function loadGTM(containerId: string) {
  if (typeof window === "undefined") return;
  // valida formato pra não injetar lixo (GTM-XXXXXXX)
  const id = containerId.trim().toUpperCase();
  if (!/^GTM-[A-Z0-9]+$/.test(id)) return;
  const w = window as any;
  // dedupe: não carrega o mesmo container 2x
  w.__loadedGTM = w.__loadedGTM || {};
  if (w.__loadedGTM[id]) return;
  w.__loadedGTM[id] = true;

  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const f = document.getElementsByTagName("script")[0];
  const j = document.createElement("script");
  j.async = true;
  j.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
  f.parentNode?.insertBefore(j, f);

  // noscript fallback (caso JS de tags dependa do iframe)
  const ns = document.createElement("noscript");
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${id}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.display = "none";
  iframe.style.visibility = "hidden";
  ns.appendChild(iframe);
  document.body.appendChild(ns);
}

/** Monta o link wa.me a partir do número (só dígitos) + mensagem opcional. */
function buildWhatsAppLink(number?: string | null, message?: string | null): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message && message.trim()
    ? `${base}?text=${encodeURIComponent(message.trim())}`
    : base;
}

/**
 * Destino do redirect pós-envio. WhatsApp tem prioridade sobre redirect_url:
 * se o form tem número de WhatsApp configurado, o botão final leva pra lá.
 */
function getEffectiveRedirect(form: PublicForm): { url: string; isWhatsApp: boolean } | null {
  const wa = buildWhatsAppLink(form.whatsapp_number, form.whatsapp_message);
  if (wa) return { url: wa, isWhatsApp: true };
  if (form.redirect_url) return { url: form.redirect_url, isWhatsApp: false };
  return null;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const slideTransition = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

// TTL = 7 dias. Sem isso, lead que abriu o form, abandonou, volta semanas
// depois → preenche com respostas velhas. Pior: o lead pode até esquecer
// quem ele é se voltar de outro dispositivo via cache.
const ANSWERS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getOrCreateSessionId(slug: string): string {
  const key = `kform.session.${slug}`;
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

interface StoredAnswers {
  answers: Record<string, FieldValue>;
  storedAt: number;
}

function getStoredAnswers(slug: string): Record<string, FieldValue> {
  try {
    const raw = sessionStorage.getItem(`kform.answers.${slug}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredAnswers | Record<string, FieldValue>;
    // backwards compat: formato antigo era objeto direto sem TTL
    if (typeof parsed === "object" && parsed !== null && "storedAt" in parsed && "answers" in parsed) {
      const age = Date.now() - (parsed as StoredAnswers).storedAt;
      if (age > ANSWERS_TTL_MS) {
        clearStored(slug);
        return {};
      }
      return (parsed as StoredAnswers).answers;
    }
    // formato antigo — limpa e ignora (TTL não existia)
    clearStored(slug);
    return {};
  } catch { return {}; }
}

function storeAnswers(slug: string, answers: Record<string, FieldValue>) {
  const payload: StoredAnswers = { answers, storedAt: Date.now() };
  sessionStorage.setItem(`kform.answers.${slug}`, JSON.stringify(payload));
}

function clearStored(slug: string) {
  sessionStorage.removeItem(`kform.answers.${slug}`);
  sessionStorage.removeItem(`kform.step.${slug}`);
}

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // -1 = welcome, 0..n-1 = fields, n = thanks
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [direction, setDirection] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, FieldValue>>({});
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  // Atribuição completa: UTMs + fbclid (Meta) + gclid (Google) + landing_url.
  // Persiste em sessionStorage pra cobrir reentries (lead clica no ad, fecha
  // aba, volta pelo link direto — não perde a origem).
  const attribution = useMemo(() => {
    const fromQuery = {
      utm_source: searchParams.get("utm_source"),
      utm_medium: searchParams.get("utm_medium"),
      utm_campaign: searchParams.get("utm_campaign"),
      utm_content: searchParams.get("utm_content"),
      utm_term: searchParams.get("utm_term"),
      fbclid: searchParams.get("fbclid"),
      gclid: searchParams.get("gclid"),
      landing_url: typeof window !== "undefined" ? window.location.href : null,
    };
    const hasAny = !!(
      fromQuery.utm_source || fromQuery.utm_campaign ||
      fromQuery.fbclid || fromQuery.gclid
    );
    if (hasAny && slug) {
      sessionStorage.setItem(`kform.attrib.${slug}`, JSON.stringify(fromQuery));
      return fromQuery;
    }
    if (slug) {
      try {
        const stored = sessionStorage.getItem(`kform.attrib.${slug}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          // landing_url SEMPRE atual (não restaurada do storage) — se lead
          // chegou direto (sem ad), captura a URL atual
          return { ...parsed, landing_url: fromQuery.landing_url };
        }
        // backwards-compat com chave antiga só de UTMs
        const oldStored = sessionStorage.getItem(`kform.utm.${slug}`);
        if (oldStored) {
          const parsed = JSON.parse(oldStored);
          return { ...parsed, fbclid: null, gclid: null, landing_url: fromQuery.landing_url };
        }
      } catch { /* */ }
    }
    return fromQuery;
  }, [searchParams, slug]);

  const sessionId = useMemo(() => slug ? getOrCreateSessionId(slug) : "", [slug]);

  // Time-to-fill: captura quando lead começa a interagir (clica em "Começar").
  // Bot que preenche em <3s é descartado silenciosamente no backend.
  const startedAtRef = useRef<number | null>(null);

  // Honeypot: campo invisível pra humanos. Bot preenche tudo no DOM,
  // inclusive campos hidden — se vier preenchido = bot.
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Captura parcial: assim que o lead preenche o campo de telefone
  // (field_mapping=contact_whatsapp) e avança, dispara criação de lead
  // pra recuperação ativa. Guarda flag pra não disparar 2x na mesma sessão.
  const partialFiredRef = useRef(false);

  // Tempo por step: registra timestamp ao entrar em cada step.
  // Effect reporta delta ao backend quando lead sai do step.
  const stepEnteredAtRef = useRef<Map<number, number>>(new Map());

  // ---------- Carregar form via RPC ----------
  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    supabase.rpc("get_public_form", { p_slug: slug }).then(({ data: form, error }) => {
      if (!active) return;
      if (error || !form) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const formData = form as unknown as PublicForm;
      setData(formData);
      // restaurar progresso da sessão
      const stored = getStoredAnswers(slug);
      if (Object.keys(stored).length > 0) setAnswers(stored);
      const storedStepRaw = sessionStorage.getItem(`kform.step.${slug}`);
      const storedStep = storedStepRaw !== null ? parseInt(storedStepRaw) : null;
      const isDirect = formData.welcome_layout === "none";
      // Só restauramos se >= 0 (lead já saiu da welcome). storedStep === -1
      // pode ser lixo do effect de persistência que rodou no mount inicial —
      // não confiável pra decidir entre welcome vs primeira pergunta.
      if (storedStep !== null && storedStep >= 0) {
        setStepIndex(storedStep);
        if (isDirect && startedAtRef.current === null) startedAtRef.current = Date.now();
      } else if (isDirect) {
        // Modo Respondi: sem capa. Pula pra primeira pergunta e marca início
        // do time-to-fill agora (não há clique de "Começar" pra disparar).
        setStepIndex(0);
        if (startedAtRef.current === null) startedAtRef.current = Date.now();
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  // ---------- GTM por formulário ----------
  // Carrega o container GTM específico deste form assim que os dados chegam.
  // Cada form pode ter um GTM diferente — daí a injeção dinâmica aqui em vez
  // de um container fixo no index.html.
  useEffect(() => {
    if (data?.gtm_container_id) loadGTM(data.gtm_container_id);
  }, [data?.gtm_container_id]);

  // ---------- Fontes customizadas (Google Fonts) ----------
  useEffect(() => {
    loadGoogleFont(data?.font_family);
    loadGoogleFont(data?.heading_font_family);
  }, [data?.font_family, data?.heading_font_family]);

  // persistir respostas + step ao mudar.
  // Guard `!data`: sem isso, esse effect rodava no mount com stepIndex=-1
  // ANTES do RPC resolver, salvando "-1" no sessionStorage. Depois o RPC
  // voltava, lia esse "-1" como restore válido e ignorava welcome_layout='none'
  // (lead caía na welcome screen mesmo no modo Respondi).
  useEffect(() => {
    if (!slug || !data) return;
    if (Object.keys(answers).length > 0) storeAnswers(slug, answers);
    sessionStorage.setItem(`kform.step.${slug}`, String(stepIndex));
  }, [answers, stepIndex, slug, data]);

  // ---------- Tracking INICIAL ----------
  // Dispara UMA VEZ assim que o form carrega (data resolveu), antes mesmo
  // do lead clicar em "Começar". Garante que toda visita à welcome screen
  // vire pageview — crucial pra entender se o problema é o anúncio (lead
  // não chega) ou o form (lead chega mas não engaja).
  const initialTrackedRef = useRef(false);
  useEffect(() => {
    if (!data || !slug || initialTrackedRef.current) return;
    initialTrackedRef.current = true;
    // .then() obrigatório: supabase.rpc retorna PostgrestBuilder lazy — sem
    // await/.then o fetch nunca dispara. Erro logado pra warn em vez de
    // engolido silenciosamente (sintoma anterior: views=0 com submits>0).
    void supabase.rpc("track_form_view", {
      p_slug: slug,
      p_session_id: sessionId,
      p_step_index: 0,
      p_total_steps: data.fields.length,
      p_user_agent: navigator.userAgent,
      p_referrer: document.referrer || null,
      p_utm_source: attribution.utm_source,
      p_utm_medium: attribution.utm_medium,
      p_utm_campaign: attribution.utm_campaign,
      p_utm_content: attribution.utm_content,
      p_utm_term: attribution.utm_term,
      p_fbclid: attribution.fbclid,
      p_gclid: attribution.gclid,
      p_landing_url: attribution.landing_url,
    }).then(({ error }) => {
      if (error) console.warn("[track_form_view:initial]", error.message);
    });
  }, [data, slug, sessionId, attribution]);

  // ---------- Tracking PROGRESSÃO ----------
  // Dispara em cada step que o lead avança (depois do welcome).
  // Upsert no DB faz greatest(last_step_index, new) — atualiza o quão
  // longe o lead chegou.
  // Também grava timestamp de entrada do step (pra reportar tempo gasto ao sair).
  useEffect(() => {
    if (!data || !slug) return;
    if (stepIndex < 0) return; // welcome já foi coberto pelo tracking inicial

    // Reporta tempo gasto no STEP ANTERIOR (se aplicável)
    // — execução acontece ao ENTRAR no novo step: lead saiu do anterior
    const previousStepIdx = stepIndex - 1;
    const previousEnteredAt = stepEnteredAtRef.current.get(previousStepIdx);
    if (previousEnteredAt && previousStepIdx >= 0) {
      const timeMs = Date.now() - previousEnteredAt;
      void (supabase as any).rpc("update_form_step_metrics", {
        p_slug: slug,
        p_session_id: sessionId,
        p_step_index: previousStepIdx,
        p_time_ms: timeMs,
      }).then(({ error }: { error: any }) => {
        if (error) console.warn("[update_form_step_metrics:time]", error.message);
      });
    }

    // Registra entrada deste step
    stepEnteredAtRef.current.set(stepIndex, Date.now());

    void supabase.rpc("track_form_view", {
      p_slug: slug,
      p_session_id: sessionId,
      p_step_index: stepIndex,
      p_total_steps: data.fields.length,
      p_user_agent: navigator.userAgent,
      p_referrer: document.referrer || null,
      p_utm_source: attribution.utm_source,
      p_utm_medium: attribution.utm_medium,
      p_utm_campaign: attribution.utm_campaign,
      p_utm_content: attribution.utm_content,
      p_utm_term: attribution.utm_term,
      p_fbclid: attribution.fbclid,
      p_gclid: attribution.gclid,
      p_landing_url: attribution.landing_url,
    }).then(({ error }) => {
      if (error) console.warn("[track_form_view:step]", error.message);
    });
  }, [stepIndex, data, slug, sessionId, attribution]);

  // ---------- Abandono via beacon ao fechar ----------
  const lastStepRef = useRef(stepIndex);
  useEffect(() => { lastStepRef.current = stepIndex; }, [stepIndex]);
  useEffect(() => {
    if (!slug) return;
    const onLeave = () => {
      if (!data) return;
      if (lastStepRef.current < 0 || lastStepRef.current >= data.fields.length) return;

      // fetch direto com keepalive: true em vez de supabase.rpc().
      // Motivo: em beforeunload/pagehide o browser cancela requests pendentes
      // (incluindo o fetch interno do supabase-js). keepalive=true permite
      // que o POST termine mesmo após a aba fechar — mesmo princípio do
      // navigator.sendBeacon, mas com suporte a headers custom (apikey).
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/mark_form_abandoned`;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      try {
        void fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            p_slug: slug,
            p_session_id: sessionId,
            p_step_index: lastStepRef.current,
          }),
          keepalive: true,
        });
      } catch { /* aba fechando — não há onde reportar */ }
    };
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [slug, data, sessionId]);

  // ---------- redirect timer pós-submit (WhatsApp ou redirect_url) ----------
  useEffect(() => {
    if (!data || stepIndex !== data.fields.length) return;
    const eff = getEffectiveRedirect(data);
    if (!eff) return;
    const t = setTimeout(() => { window.location.href = eff.url; }, 5000);
    return () => clearTimeout(t);
  }, [stepIndex, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-kpage flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-kblue" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-kpage flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-[20px] font-bold text-navy">Form não encontrado</h1>
          <p className="mt-2 text-[13px] text-ktxt">
            O link pode ter expirado ou está pausado.
          </p>
        </div>
      </div>
    );
  }

  const totalSteps = data.fields.length;
  const isWelcome = stepIndex < 0;
  const isThanks = stepIndex >= totalSteps;
  const currentField = !isWelcome && !isThanks ? data.fields[stepIndex] : null;

  const progress = isWelcome ? 0 : isThanks ? 100 : ((stepIndex + 1) / totalSteps) * 100;

  const fieldMapping = currentField?.field_mapping;

  const goNext = () => {
    if (currentField) {
      const v = answers[currentField.id] ?? null;
      const err = validateField(currentField, v);
      if (err) {
        setShowError(true);
        // Tracking: reporta erro de validação pra Cauã ver no admin qual campo confunde
        if (slug) {
          void (supabase as any).rpc("update_form_step_metrics", {
            p_slug: slug,
            p_session_id: sessionId,
            p_validation_error_field_id: currentField.id,
          });
        }
        return;
      }
    }

    // GATILHO PARCIAL: lead avançou do campo de telefone com valor válido?
    // Dispara criação de lead em background pra recuperação ativa via WhatsApp.
    // partialFiredRef garante 1 disparo por sessão.
    if (
      currentField &&
      fieldMapping === "contact_whatsapp" &&
      !partialFiredRef.current &&
      data
    ) {
      partialFiredRef.current = true;

      // EVENTO DE CONVERSÃO INTERMEDIÁRIA pro GTM/Meta Pixel.
      // Pode ser usado como evento de otimização secundário no Meta Ads
      // (mais sinal pro algoritmo do que esperar só lead_complete).
      try {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: "lead_partial",
          form_slug: data.slug,
          form_name: data.name,
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          utm_term: attribution.utm_term,
          fbclid: attribution.fbclid,
          gclid: attribution.gclid,
        });
      } catch { /* */ }

      // fire-and-forget: não bloqueia UX do lead. Erros silenciosos —
      // ainda assim ele consegue terminar o form normalmente.
      (async () => {
        try {
          await supabase.rpc("upsert_partial_lead", {
            p_slug: data.slug,
            p_session_id: sessionId,
            p_answers: answers as any,
            p_user_agent: navigator.userAgent,
            p_referrer: document.referrer || null,
            p_utm_source: attribution.utm_source,
            p_utm_medium: attribution.utm_medium,
            p_utm_campaign: attribution.utm_campaign,
            p_utm_content: attribution.utm_content,
            p_utm_term: attribution.utm_term,
            p_fbclid: attribution.fbclid,
            p_gclid: attribution.gclid,
            p_landing_url: attribution.landing_url,
          });
        } catch { /* falha silenciosa */ }
      })();
    }

    setShowError(false);
    setDirection(1);
    setStepIndex((s) => s + 1);
  };

  const goBack = () => {
    if (stepIndex <= -1) return;
    setShowError(false);
    setDirection(-1);
    setStepIndex((s) => s - 1);
  };

  const setAnswer = (fieldId: string, v: FieldValue) => {
    setShowError(false);
    setAnswers((prev) => ({ ...prev, [fieldId]: v }));
  };

  const handleSubmit = async () => {
    if (!data) return;
    // validar tudo (campos obrigatórios)
    for (const f of data.fields) {
      const err = validateField(f, answers[f.id] ?? null);
      if (err) {
        setShowError(true);
        // salta pro primeiro com erro
        const idx = data.fields.findIndex((x) => x.id === f.id);
        setStepIndex(idx);
        return;
      }
    }
    setSubmitting(true);
    setSubmitErr(null);
    try {
      // Honeypot: se preenchido = bot. Backend descarta silenciosamente,
      // mas economizamos uma chamada de rede e mostramos sucesso simulado.
      const honeypotValue = honeypotRef.current?.value ?? "";
      // Time-to-fill: ms desde que clicou em "Começar" no welcome
      const timeToFillMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
      const timeToFillSeconds = timeToFillMs != null ? Math.max(0, Math.round(timeToFillMs / 1000)) : null;

      const { error } = await supabase.rpc("submit_form_response", {
        p_slug: data.slug,
        p_session_id: sessionId,
        p_answers: answers as any,
        p_user_agent: navigator.userAgent,
        p_referrer: document.referrer || null,
        p_utm_source: attribution.utm_source,
        p_utm_medium: attribution.utm_medium,
        p_utm_campaign: attribution.utm_campaign,
        p_utm_content: attribution.utm_content,
        p_utm_term: attribution.utm_term,
        p_fbclid: attribution.fbclid,
        p_gclid: attribution.gclid,
        p_landing_url: attribution.landing_url,
        p_honeypot: honeypotValue || null,
        p_time_to_fill_seconds: timeToFillSeconds,
      });
      if (error) throw error;

      // EVENTO DE CONVERSÃO pro GTM/Meta Pixel/GA4
      // Aqui é onde Meta Ads otimiza pra "Lead" — momento que define
      // se o anúncio aprende a buscar leads similares ou não.
      try {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: "lead_complete",
          form_slug: data.slug,
          form_name: data.name,
          // Não enviamos PII (nome/email/telefone) pro dataLayer por padrão —
          // pixels usam isso pra advanced matching mas requer SHA256 hash
          // do lado do servidor (CAPI). Mantemos só atribuição.
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          utm_term: attribution.utm_term,
          fbclid: attribution.fbclid,
          gclid: attribution.gclid,
        });
      } catch { /* dataLayer pode não existir em testes/dev */ }

      clearStored(data.slug);
      setDirection(1);
      setStepIndex(totalSteps);
    } catch (e: any) {
      setSubmitErr(e.message?.includes("Rate limit")
        ? "Muitas tentativas. Tenta novamente em uma hora."
        : "Não foi possível enviar agora. Tenta novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const onStepSubmit = () => {
    if (currentField && stepIndex === totalSteps - 1) {
      // último campo: validar e submeter
      const err = validateField(currentField, answers[currentField.id] ?? null);
      if (err) { setShowError(true); return; }
      handleSubmit();
    } else {
      goNext();
    }
  };

  // CSS vars de tema — primary_color/bg/grad customizáveis. Fallback Komplexa.
  const primaryColor = data.primary_color || "#1455F5";
  const primaryGrad = `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 60%, white))`;
  // Fontes customizadas (white label). Corpo herda pra tudo; títulos podem
  // ter fonte própria via <style> escopado abaixo.
  const bodyFont = fontStack(data.font_family);
  const headingFont = fontStack(data.heading_font_family);
  const themeStyle: React.CSSProperties = {
    // @ts-expect-error CSS custom properties via React style
    "--form-primary": primaryColor,
    "--form-primary-grad": primaryGrad,
    ...(bodyFont ? { fontFamily: bodyFont } : {}),
  };
  // Background custom: se gradient é uma string CSS válida, aplica direto.
  // Senão usa o gradient default Komplexa.
  const customBackground = data.background_gradient
    ? { background: data.background_gradient }
    : undefined;

  return (
    <div
      data-kform-root
      className="min-h-[100dvh] bg-gradient-to-b from-kblue/[0.03] via-white to-white text-navy flex flex-col"
      style={{ ...themeStyle, ...customBackground }}
    >
      {/* Fonte dos títulos escopada a este form (quando diferente do corpo) */}
      {headingFont && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-kform-root] h1,[data-kform-root] h2,[data-kform-root] h3{font-family:${headingFont};}`,
          }}
        />
      )}
      {/* progress bar fixa */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-kbg z-10">
        <motion.div
          className="h-full"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ background: primaryGrad }}
        />
      </div>

      {/* header minimal */}
      <header className="px-5 sm:px-6 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isWelcome && !isThanks && (
            <button
              onClick={goBack}
              className="h-9 w-9 rounded-full inline-flex items-center justify-center text-kgray hover:text-navy hover:bg-kbg transition"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        {data.logo_url ? (
          <img src={data.logo_url} alt="" className="h-6 w-auto max-w-[120px] object-contain" />
        ) : data.white_label ? (
          <span />
        ) : (
          <KLogo size={24} />
        )}
        <div className="text-[11px] text-kgray font-mono w-9 text-right">
          {!isWelcome && !isThanks && `${stepIndex + 1}/${totalSteps}`}
        </div>
      </header>

      {/* corpo */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 overflow-x-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {isWelcome && (
            <motion.div
              key="welcome"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              className="w-full px-5 sm:px-6"
            >
              <WelcomeRenderer
                layout={(data.welcome_layout as WelcomeLayout | null) ?? "minimal"}
                eyebrow={data.welcome_eyebrow}
                title={data.welcome_title}
                subtitle={data.welcome_subtitle}
                bullets={data.welcome_bullets}
                buttonText={data.welcome_button_text}
                totalSteps={totalSteps}
                onStart={() => {
                  if (startedAtRef.current === null) startedAtRef.current = Date.now();
                  setDirection(1);
                  setStepIndex(0);
                }}
                heroImageUrl={data.hero_image_url}
                heroVideoUrl={data.hero_video_url}
                socialProofLogos={data.social_proof_logos}
                testimonial={data.testimonial}
                heroStat={data.hero_stat}
              />
            </motion.div>
          )}

          {currentField && (
            <motion.div
              key={`f-${currentField.id}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              className="w-full"
            >
              {/* Microcopy de progresso — cria urgência positiva no fim */}
              {totalSteps > 1 && (
                <div className="w-full max-w-[640px] mx-auto px-5 sm:px-6 mb-4">
                  {stepIndex === totalSteps - 1 ? (
                    <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-ok">
                      🎉 Última pergunta!
                    </p>
                  ) : stepIndex === totalSteps - 2 ? (
                    <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-warn">
                      Falta pouco · pergunta {stepIndex + 1} de {totalSteps}
                    </p>
                  ) : (
                    <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-kgray">
                      Pergunta {stepIndex + 1} de {totalSteps}
                    </p>
                  )}
                </div>
              )}
              <FormStepView
                field={currentField}
                value={answers[currentField.id] ?? null}
                onChange={(v) => setAnswer(currentField.id, v)}
                onSubmit={onStepSubmit}
                showError={showError}
                isLastStep={stepIndex === totalSteps - 1}
              />
              {submitting && stepIndex === totalSteps - 1 && (
                <p className="mt-4 text-center text-[12px] text-kgray inline-flex items-center justify-center w-full gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                </p>
              )}
              {submitErr && (
                <p className="mt-4 text-center text-[12px] text-danger">{submitErr}</p>
              )}
            </motion.div>
          )}

          {isThanks && (
            <motion.div
              key="thanks"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              className="w-full max-w-[520px] mx-auto px-5 sm:px-6 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.05 }}
                className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-success-soft text-success mb-5"
              >
                <CheckCircle2 className="h-8 w-8" />
              </motion.div>
              <h1 className="text-[28px] sm:text-[32px] leading-tight font-bold text-navy">
                {data.thank_you_title}
              </h1>
              {data.thank_you_message && (
                <p className="mt-3 text-[15px] text-ktxt">{data.thank_you_message}</p>
              )}
              {(() => {
                const eff = getEffectiveRedirect(data);
                if (!eff) return null;
                return (
                  <div className="mt-6">
                    <a
                      href={eff.url}
                      target={eff.isWhatsApp ? "_blank" : undefined}
                      rel={eff.isWhatsApp ? "noopener noreferrer" : undefined}
                      className={
                        eff.isWhatsApp
                          ? "inline-flex items-center gap-2 h-11 px-6 rounded-[12px] bg-[#25D366] text-white font-bold text-[13px] hover:opacity-95"
                          : "inline-flex items-center gap-2 h-11 px-6 rounded-[12px] bg-k-grad text-white font-bold text-[13px] hover:opacity-95"
                      }
                    >
                      {eff.isWhatsApp ? (
                        <>Continuar no WhatsApp <MessageCircle className="h-4 w-4" /></>
                      ) : (
                        <>Continuar <ArrowRight className="h-4 w-4" /></>
                      )}
                    </a>
                    <p className="mt-2 text-[11px] text-kgray">redirecionando em 5s</p>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Honeypot: invisível pra humanos (off-screen, sem tabIndex, aria-hidden).
          Bots de spam que tentam preencher TODOS os inputs do DOM caem aqui.
          Backend descarta silenciosamente se vier preenchido. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="kform-website">Não preencha este campo</label>
        <input
          ref={honeypotRef}
          id="kform-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {!data.white_label && (
        <footer className="py-3 text-center text-[10px] text-kgray">
          powered by <span className="font-bold k-grad-text">Komplexa</span>
        </footer>
      )}
    </div>
  );
}
