/** Pausa o programa de Grãos: saldos preservados, sem novos créditos nem resgates.
 *  Para reativar: `PORTAL_GRAOS_CONGELADO=false` no ambiente (Vercel). */
export const GRAOS_CONGELADO_MENSAGEM =
  'Grãos temporariamente congelados. Em breve voltaremos. Seu saldo está guardado.';

export function graosCongelado(): boolean {
  return process.env.PORTAL_GRAOS_CONGELADO !== 'false';
}
