import { ArrowRight } from "lucide-react";
import type { WelcomeLayoutProps } from "./types";

/**
 * Layout SOCIAL PROOF — texto + grid de logos de clientes/parceiros.
 * Trust signal forte: lead vê quem já confia + entra mais propenso.
 */
export function SocialProofLayout(props: WelcomeLayoutProps) {
  const { eyebrow, title, subtitle, buttonText, totalSteps, onStart, socialProofLogos } = props;
  const logos = socialProofLogos ?? [];

  return (
    <div className="w-full max-w-[760px] mx-auto text-center">
      {eyebrow && (
        <p className="text-[11px] uppercase tracking-[0.18em] text-kblue font-bold mb-4">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[26px] sm:text-[34px] leading-[1.15] font-bold text-navy">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 text-[14.5px] sm:text-[16px] text-ktxt max-w-[560px] mx-auto leading-relaxed">
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
      <p className="mt-3 text-[11px] text-kgray">
        Só {totalSteps} pergunta{totalSteps !== 1 ? "s" : ""} · menos de {Math.max(1, Math.round(totalSteps * 0.3))} min
      </p>

      {/* Logos */}
      {logos.length > 0 ? (
        <div className="mt-12 pt-8 border-t border-kbdr/60">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-kgray mb-5">
            Quem já confia
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 items-center">
            {logos.map((logo, i) => {
              const img = (
                <img
                  src={logo.logo_url}
                  alt={logo.alt ?? ""}
                  className="max-h-12 max-w-full mx-auto opacity-70 hover:opacity-100 transition-opacity"
                />
              );
              return logo.href ? (
                <a key={i} href={logo.href} target="_blank" rel="noreferrer">{img}</a>
              ) : (
                <div key={i}>{img}</div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-10 pt-6 border-t border-kbdr/60">
          <p className="text-[11.5px] text-kgray italic">
            (Adicione logos de clientes em /admin/forms pra exibir aqui)
          </p>
        </div>
      )}
    </div>
  );
}
