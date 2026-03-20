'use client';

import { useState } from 'react';

const WHATSAPP_NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_AJUDA || '5521999409351';
const EMAIL_AJUDA = process.env.NEXT_PUBLIC_EMAIL_AJUDA || 'colaboragabifontes@gmail.com';

function formatarNumero( raw: string ): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) return `+55 (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return raw;
}

export function BotaoAjuda() {
  const [aberto, setAberto] = useState(false);

  const mensagemWhatsApp = encodeURIComponent(
    'Olá! Preciso de ajuda. (Portal do Colaborador)'
  );
  const linkWhatsApp = `https://wa.me/${WHATSAPP_NUMERO.replace(/\D/g, '')}?text=${mensagemWhatsApp}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-dourado-base text-cream-100 shadow-lg hover:bg-dourado-400 transition-colors flex items-center justify-center"
        aria-label="Preciso de ajuda"
        title="Preciso de ajuda"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <div className="fixed bottom-36 right-4 left-4 md:bottom-24 md:left-auto md:right-6 md:w-72 z-50 rounded-xl bg-white border border-dourado-200 shadow-xl p-4">
            <h3 className="font-display font-semibold text-coffee-base mb-3">Precisa de ajuda?</h3>
            <p className="text-xs text-coffee-100 mb-3">
              Contato: WhatsApp {formatarNumero(WHATSAPP_NUMERO)} · {EMAIL_AJUDA}
            </p>
            <div className="space-y-2">
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 hover:bg-green-100 transition-colors"
              >
                <svg className="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-sm font-medium">WhatsApp</span>
              </a>
              <a
                href={`mailto:${EMAIL_AJUDA}?subject=Ajuda - Portal Colaborador`}
                className="flex items-center gap-3 rounded-lg bg-cream-100 border border-cream-300 px-4 py-3 text-coffee-base hover:bg-cream-200 transition-colors"
              >
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">E-mail</span>
              </a>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="mt-3 w-full text-coffee-100 text-sm hover:underline"
            >
              Fechar
            </button>
          </div>
        </>
      )}
    </>
  );
}
