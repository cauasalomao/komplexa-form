import { ArrowRight, Check } from "lucide-react";
import type { WelcomeLayoutProps } from "./types";

/**
 * Layout HERO IMAGE — texto à esquerda + imagem grande à direita.
 * Mobile: imagem em cima, texto embaixo. Ideal pra B2B premium /
 * captação sofisticada onde o visual do produto importa.
 */
export function HeroImageLayout(props: WelcomeLayoutProps) {
  const { eyebrow, title, subtitle, bullets, buttonText, totalSteps, onStart, heroImageUrl } = props;

  return (
    <div className="w-full max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      {/* Texto */}
      <div className="order-2 lg:order-1 text-center lg:text-left">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.18em] text-kblue font-bold mb-4">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] sm:text-[32px] lg:text-[40px] leading-[1.1] font-bold text-navy">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-[14.5px] sm:text-[16px] lg:text-[17px] text-ktxt leading-relaxed">
            {subtitle}
          </p>
        )}
        {bullets && bullets.length > 0 && (
          <ul className="mt-6 space-y-2.5 text-left max-w-[420px] mx-auto lg:mx-0">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13.5px] sm:text-[14.5px] text-navy">
                <span className="mt-0.5 h-5 w-5 rounded-full inline-flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--form-primary, #1455F5) 12%, transparent)", color: "var(--form-primary, #1455F5)" }}>
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onStart}
          className="mt-8 h-12 sm:h-14 px-7 sm:px-9 rounded-[14px] text-white font-bold text-[14px] sm:text-[15px] inline-flex items-center gap-2 shadow-md hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.99]"
          style={{ background: "var(--form-primary-grad, linear-gradient(135deg, #1455F5, #4F8AFE))" }}
        >
          {buttonText} <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-5 text-[11px] text-kgray">
          Só {totalSteps} pergunta{totalSteps !== 1 ? "s" : ""} · menos de {Math.max(1, Math.round(totalSteps * 0.3))} min
        </p>
      </div>

      {/* Imagem */}
      <div className="order-1 lg:order-2 w-full">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt=""
            className="w-full h-auto max-h-[480px] object-cover rounded-[20px] shadow-lg"
          />
        ) : (
          <div className="w-full aspect-[4/3] rounded-[20px] flex items-center justify-center text-kgray text-[12px] italic"
            style={{ background: "color-mix(in srgb, var(--form-primary, #1455F5) 8%, white)" }}>
            (Adicione uma imagem em /admin/forms)
          </div>
        )}
      </div>
    </div>
  );
}
