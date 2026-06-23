export function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidCPF(v: string): boolean {
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

export function isValidCNPJ(v: string): boolean {
  const d = v.replace(/\D/g, "");
  if (d.length !== 14) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const calc = (slice: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(slice[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return calc(d.slice(0, 12), w1) === parseInt(d[12]) &&
         calc(d.slice(0, 13), w2) === parseInt(d[13]);
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ---------- Número inteiro genérico (UHs, qtd, idade) ----------
// Mantém só dígitos. Sem separador de milhar — entrada simples.
export function maskNumber(v: string): string {
  return v.replace(/\D/g, "");
}

export function parseNumber(v: string): number | null {
  const d = v.replace(/\D/g, "");
  if (!d) return null;
  return parseInt(d, 10);
}

// ---------- Moeda BRL (diária média, faturamento, ticket) ----------
// Lê só dígitos e formata como centavos: "1234" -> "R$ 12,34",
// "123456" -> "R$ 1.234,56". Vazio devolve "" pra placeholder mostrar.
export function maskCurrencyBRL(v: string): string {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const cents = parseInt(d, 10);
  const reais = Math.floor(cents / 100);
  const c = cents % 100;
  const reaisStr = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${reaisStr},${c.toString().padStart(2, "0")}`;
}

export function parseCurrencyBRL(v: string): number | null {
  const d = v.replace(/\D/g, "");
  if (!d) return null;
  return parseInt(d, 10) / 100;
}
