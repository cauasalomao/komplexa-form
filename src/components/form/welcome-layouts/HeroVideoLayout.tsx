import { ArrowRight, PlayCircle } from "lucide-react";
import type { WelcomeLayoutProps } from "./types";

/**
 * Extrai ID do YouTube ou Vimeo de uma URL completa.
 * Suporta: youtube.com/watch?v=ID, youtu.be/ID, vimeo.com/ID, vimeo.com/manage/videos/ID
 */
function extractEmbedUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();

  // YouTube
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1`;

  // Vimeo
  m = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}?title=0&byline=0&portrait=0`;

  // Já é embed
  if (url.includes("/embed/") || url.includes("/player.vimeo.com/")) return url;

  return null;
}

/**
 * Layout HERO VIDEO — vídeo (YouTube/Vimeo) acima do texto + CTA.
 * Ideal pra pitch comercial, webinar, explicação rápida.
 */
export function HeroVideoLayout(props: WelcomeLayoutProps) {
  const { eyebrow, title, subtitle, buttonText, totalSteps, onStart, heroVideoUrl } = props;
  const embedUrl = extractEmbedUrl(heroVideoUrl);

  return (
    <div className="w-full max-w-[760px] mx-auto text-center">
      {/* Video */}
      <div className="mb-6 w-full aspect-video rounded-[16px] overflow-hidden shadow-lg bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerated-2d-canvas; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Apresentação"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-kgray text-[12px] italic gap-3">
            <PlayCircle className="h-12 w-12 opacity-40" />
            (Adicione URL de YouTube ou Vimeo em /admin/forms)
          </div>
        )}
      </div>

      {eyebrow && (
        <p className="text-[11px] uppercase tracking-[0.18em] text-kblue font-bold mb-3">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[24px] sm:text-[30px] leading-[1.15] font-bold text-navy">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-[14px] sm:text-[15px] text-ktxt max-w-[560px] mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
      <button
        type="button"
        onClick={onStart}
        className="mt-6 h-12 sm:h-14 px-7 sm:px-9 rounded-[14px] text-white font-bold text-[14px] sm:text-[15px] inline-flex items-center gap-2 shadow-md hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.99]"
        style={{ background: "var(--form-primary-grad, linear-gradient(135deg, #1455F5, #4F8AFE))" }}
      >
        {buttonText} <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-5 text-[11px] text-kgray">
        Só {totalSteps} pergunta{totalSteps !== 1 ? "s" : ""} · menos de {Math.max(1, Math.round(totalSteps * 0.3))} min
      </p>
    </div>
  );
}
