import type { WelcomeLayout, WelcomeLayoutProps } from "./types";
import { MinimalLayout } from "./MinimalLayout";
import { HeroImageLayout } from "./HeroImageLayout";
import { HeroVideoLayout } from "./HeroVideoLayout";
import { SocialProofLayout } from "./SocialProofLayout";
import { TestimonialLayout } from "./TestimonialLayout";
import { QuizStatsLayout } from "./QuizStatsLayout";

export { MinimalLayout, HeroImageLayout, HeroVideoLayout, SocialProofLayout, TestimonialLayout, QuizStatsLayout };
export type { WelcomeLayout, WelcomeLayoutProps, SocialProofLogo, Testimonial, HeroStat } from "./types";

/**
 * Despacha pro layout correto baseado no campo forms.welcome_layout.
 * Default = minimal. Layout desconhecido também cai pra minimal.
 */
export function WelcomeRenderer({ layout, ...props }: WelcomeLayoutProps & { layout: WelcomeLayout | string | null }) {
  switch (layout) {
    case "hero_image":   return <HeroImageLayout {...props} />;
    case "hero_video":   return <HeroVideoLayout {...props} />;
    case "social_proof": return <SocialProofLayout {...props} />;
    case "testimonial":  return <TestimonialLayout {...props} />;
    case "quiz_stats":   return <QuizStatsLayout {...props} />;
    // 'none' = sem capa. PublicForm pula direto pra pergunta 1 (stepIndex=0),
    // então este renderer nunca é chamado pra 'none'. Fallback defensivo:
    // se chegar aqui por engano, renderiza minimal pra não quebrar.
    case "none":
    case "minimal":
    default:             return <MinimalLayout {...props} />;
  }
}

/**
 * Metadata pros 6 layouts — usado no editor admin pra mostrar gallery.
 */
export const LAYOUT_OPTIONS: Array<{
  key: WelcomeLayout;
  name: string;
  description: string;
  bestFor: string;
}> = [
  { key: "none", name: "Sem capa (Respondi)", description: "Sem tela de boas-vindas — abre direto na pergunta 1.", bestFor: "Tráfego pago (Meta/Google Ads) — máxima conversão" },
  { key: "minimal", name: "Minimal", description: "Texto centralizado vertical, sem imagem.", bestFor: "Captação geral, foco em conversão pura" },
  { key: "hero_image", name: "Hero Image", description: "Texto à esquerda + imagem grande à direita.", bestFor: "B2B premium / lead sofisticado" },
  { key: "hero_video", name: "Hero Video", description: "Vídeo YouTube/Vimeo + texto + CTA.", bestFor: "Pitch comercial / webinar / explicação" },
  { key: "social_proof", name: "Social Proof", description: "Texto + logos de clientes/parceiros.", bestFor: "Captação com prova social forte" },
  { key: "testimonial", name: "Testimonial", description: "Texto + depoimento (foto + quote).", bestFor: "Pós-evento / pós-demo / follow-up" },
  { key: "quiz_stats", name: "Quiz/Stats", description: "Texto + número grande como hook.", bestFor: "Lead magnet com hook quantitativo" },
];
