/**
 * Props comuns aos 6 componentes de layout da landing page do form.
 * Cada layout recebe os mesmos props — diferença é só visual.
 */

export interface SocialProofLogo {
  logo_url: string;
  alt?: string;
  href?: string;
}

export interface Testimonial {
  quote: string;
  author_name: string;
  author_role?: string;
  avatar_url?: string;
}

export interface HeroStat {
  value: string;       // ex: "200+"
  label: string;       // ex: "hotéis confiam"
  sublabel?: string;   // ex: "em todo Brasil"
}

export interface WelcomeLayoutProps {
  // Conteúdo base (sempre presente)
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  bullets?: string[] | null;
  buttonText: string;
  totalSteps: number;
  onStart: () => void;
  // Assets visuais (opcionais)
  heroImageUrl?: string | null;
  heroVideoUrl?: string | null;
  socialProofLogos?: SocialProofLogo[] | null;
  testimonial?: Testimonial | null;
  heroStat?: HeroStat | null;
}

export type WelcomeLayout =
  | "minimal"
  | "hero_image"
  | "hero_video"
  | "social_proof"
  | "testimonial"
  | "quiz_stats"
  // 'none' = sem capa. Form abre direto na primeira pergunta (estilo Respondi).
  // PublicForm trata esse caso inicializando stepIndex=0 — o WelcomeRenderer
  // nunca é chamado pra 'none'.
  | "none";
