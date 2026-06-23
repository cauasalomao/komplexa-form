import { cn } from "@/lib/utils";

interface Props {
  /**
   * - "navy" → fundo claro: símbolo azul + texto navy
   * - "white" → fundo escuro/colorido: símbolo branco + texto branco
   * - "symbol" → só o símbolo (cor herda do variant via prop separada)
   */
  variant?: "navy" | "white" | "symbol";
  /** Tamanho do símbolo em px */
  size?: number;
  /** Mostra o nome "komplexa" ao lado (default true) */
  withWord?: boolean;
  /** Quando variant="symbol", força a cor do símbolo */
  symbolColor?: "blue" | "white";
  className?: string;
}

/**
 * Logo Komplexa — usa as SVGs oficiais em /public.
 * - logotipo_blue.svg = símbolo "k" com gradient azul (pra fundos claros)
 * - logotipo_white.svg = símbolo "k" branco (pra fundos escuros)
 *
 * Convenção: fundo branco usa azul, fundo escuro usa branco.
 */
export function KLogo({
  variant = "navy",
  size = 28,
  withWord = true,
  symbolColor,
  className,
}: Props) {
  const useWhiteSymbol =
    variant === "white" || (variant === "symbol" && symbolColor === "white");

  const src = useWhiteSymbol ? "/logotipo_white.svg" : "/logotipo_blue.svg";
  const wordColor = variant === "white" ? "#FFFFFF" : "#0E1E35";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={src}
        alt="Komplexa"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0"
      />
      {variant !== "symbol" && withWord && (
        <span
          className="font-extrabold tracking-tight"
          style={{ color: wordColor, fontSize: Math.round(size * 0.64) }}
        >
          komplexa
        </span>
      )}
    </span>
  );
}
