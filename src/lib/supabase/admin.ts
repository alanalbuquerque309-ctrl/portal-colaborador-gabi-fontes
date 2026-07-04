import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _singleton: SupabaseClient | null = null;

/**
 * Cliente Supabase com service role — usar APENAS no servidor.
 * Ignora RLS; use para operações que precisam de permissão elevada.
 * Reutiliza a mesma instância dentro do mesmo processo (warm invocation).
 */
export function createAdminClient(): SupabaseClient {
  if (_singleton) return _singleton;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  }
  _singleton = createClient(url, key);
  return _singleton;
}
