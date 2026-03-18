import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com service role — usar APENAS no servidor.
 * Ignora RLS; use para operações que precisam de permissão elevada.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  }
  return createClient(url, key);
}
