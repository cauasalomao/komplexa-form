import { ArrowRight, Quote } from "lucide-react";
import type { WelcomeLayoutProps } from "./types";

/**
 * Layout TESTIMONIAL — texto + card de depoimento (foto + nome + cargo + quote).
 * Ideal pra pós-evento, pós-demo, sales follow-up: prova social emocional.
 */
export function TestimonialLayout(props: WelcomeLayoutProps) {
  const { eyebrow, title, subtitle, buttonText, totalSteps, onStart, testimonial } = props;

  return (
    <div className="w-full max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 items-center">
      {/* Texto */}
      <div className="text-center lg:text-left">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.18em] text-kblue font-bold mb-4">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.1] font-bold text-navy">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-[14.5px] sm:text-[16px] text-ktxt leading-relaxed max-w-[480px] mx-auto lg:mx-0">
            {subtitle}
          </p>
        )}
        <button
          type="button"
          onClick={onStart}
          className="mt-7 h-12 sm:h-14 px-7 sm:px-9 rounded-[14px] text-white font-bold text-[14px] sm:text-[15px] inline-flex items-center gap-2 shadow-md hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.99]"
          style={{ background: "var(--form-primary-grad, linear-gradient(135deg, #1455F5, #4F8AFE))" }}
        >
          {buttonText} <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-4 text-[11px] text-kgray">
          Só {totalSteps} pergunta{totalSteps !== 1 ? "s" : ""} · menos de {Math.max(1, Math.round(totalSteps * 0.3))} min
        </p>
      </div>

      {/* Testimonial card */}
      {testimonial?.quote ? (
        <div className="bg-white rounded-[20px] p-6 sm:p-7 shadow-lg border border-kbdr">
          <Quote className="h-8 w-8 mb-3" style={{ color: "var(--form-primary, #1455F5)" }} />
          <p className="text-[15px] sm:text-[16px] text-navy leading-relaxed italic">
            "{testimonial.quote}"
          </p>
          <div className="mt-5 flex items-center gap-3">
            {testimonial.avatar_url ? (
              <img
                src={testimonial.avatar_url}
                alt={testimonial.author_name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-[16px]"
                style={{ background: "var(--form-primary, #1455F5)" }}>
                {testimonial.author_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[13.5px] font-bold text-navy">{testimonial.author_name}</p>
              {testimonial.author_role && (
                <p className="text-[11.5px] text-kgray">{testimonial.author_role}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-kbg rounded-[20px] p-8 text-center text-[12px] text-kgray italic">
          (Adicione um depoimento em /admin/forms)
        </div>
      )}
    </div>
  );
}
