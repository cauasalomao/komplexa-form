import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** True só quando as duas envs estão presentes. Usado pra mostrar uma tela
 *  de erro amigável em vez de quebrar com "tela branca" (createClient lança
 *  exceção em tempo de import se a URL vier vazia — antes do React renderizar). */
export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  console.error(
    "[supabase] VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes. " +
    "Configure as variáveis de ambiente (no Vercel: Project → Settings → " +
    "Environment Variables) e faça um novo deploy."
  );
}

// Fallback pra placeholder válido quando faltar config: evita o throw no import
// (que causa a tela branca). A UI mostra a mensagem de configuração via main.tsx.
export const supabase = createClient<Database>(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true } },
);
