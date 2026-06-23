import { ArrowRight, Check } from "lucide-react";
import type { WelcomeLayoutProps } from "./types";

/**
 * Layout QUIZ/STATS — texto + estatística grande.
 * Ex: "200+ hotéis confiam" como hook visual. Ideal pra lead magnet
 * onde o número POR SI SÓ é a copy.
 */
export function QuizStatsLayout(props: WelcomeLayoutProps) {
  const { eyebrow, title, subtitle, bullets, buttonText, totalSteps, onStart, heroStat } = props;

  return (
    <div className="w-full max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      {/* Stat grande */}
      <div className="order-1 lg:order-1 text-center">
        {heroStat ? (
          <div className="inline-block">
            <p className="text-[68px] sm:text-[88px] lg:text-[120px] leading-[0.95] font-extrabold tabular-nums"
              style={{ color: "var(--form-primary, #1455F5)" }}>
              {heroStat.value}
            </p>
            <p className="mt-3 text-[16px] sm:text-[18px] font-bold text-navy uppercase tracking-wider">
              {heroStat.label}
            </p>
            {heroStat.sublabel && (
              <p className="mt-1 text-[12.5px] text-kgray">
                {heroStat.sublabel}
              </p>
            )}
          </div>
        ) : (
          <div className="p-12 rounded-[20px] bg-kbg text-[12px] text-kgray italic">
            (Adicione um número grande em /admin/forms)
          </div>
        )}
      </div>

      {/* Texto + CTA */}
      <div className="order-2 lg:order-2 text-center lg:text-left">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.18em] text-kblue font-bold mb-4">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[24px] sm:text-[30px] leading-[1.15] font-bold text-navy">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-[14px] sm:text-[15.5px] text-ktxt leading-relaxed">
            {subtitle}
          </p>
        )}
        {bullets && bullets.length > 0 && (
          <ul className="mt-5 space-y-2 text-left">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] text-navy">
                <span className="mt-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--form-primary, #1455F5) 12%, transparent)", color: "var(--form-primary, #1455F5)" }}>
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onStart}
          className="mt-6 h-12 sm:h-14 px-7 sm:px-9 rounded-[14px] text-white font-bold text-[14px] sm:text-[15px] inline-flex items-center gap-2 shadow-md hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.99]"
          style={{ background: "var(--form-primary-grad, linear-gradient(135deg, #1455F5, #4F8AFE))" }}
        >
          {buttonText} <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-4 text-[11px] text-kgray">
          Só {totalSteps} pergunta{totalSteps !== 1 ? "s" : ""} · menos de {Math.max(1, Math.round(totalSteps * 0.3))} min
        </p>
      </div>
    </div>
  );
}
