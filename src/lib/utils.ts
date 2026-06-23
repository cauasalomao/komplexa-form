import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata phone brasileiro pra exibição:
 *   "5512981935958"  → "(12) 98193-5958"
 *   "12981935958"    → "(12) 98193-5958"
 *   "1281935958"     → "(12) 8193-5958"  (formato antigo, 8 digitos)
 *   qualquer outro   → "+<digitos>" (cai pra exibição internacional)
 *
 * Aceita string com qualquer formatação — strip de não-dígitos primeiro.
 */
export function formatBrPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  let local = digits;
  if (local.length >= 12 && local.startsWith("55")) local = local.substring(2);

  if (local.length === 11) {
    return `(${local.substring(0, 2)}) ${local.substring(2, 7)}-${local.substring(7, 11)}`;
  }
  if (local.length === 10) {
    return `(${local.substring(0, 2)}) ${local.substring(2, 6)}-${local.substring(6, 10)}`;
  }
  return `+${digits}`;
}
