// Tipos do Supabase para este app standalone de Forms.
//
// Mantemos um Database permissivo (any) de propósito: o app usa RPCs e
// selects dinâmicos sobre as tabelas de forms, e a tipagem rígida gerada
// pela CLI não agrega aqui. Para regenerar tipos reais quando tiver a CLI
// conectada: `supabase gen types typescript --project-id <id> > types.ts`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
