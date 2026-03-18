'use client';

/** Cards interativos da etapa Cultura — História e Pilares */

export function CulturaCards() {
  return (
    <div className="space-y-4">
      {/* Card 1: Nossa História */}
      <article className="rounded-xl border border-dourado-200 bg-cream-50 p-4 shadow-sm overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-dourado-100 flex items-center justify-center">
            <span className="text-dourado-500 font-display text-xl">2019</span>
          </div>
          <div>
            <h3 className="font-display font-semibold text-coffee-base mb-1">Nossa História</h3>
            <p className="text-coffee-100 text-sm leading-relaxed">
              A <strong>Gabi Fontes</strong> nasceu com apenas{' '}
              <strong className="text-dourado-500">12 cadeiras</strong> e um sonho grande. O segredo
              do nosso brigadeiro? <strong>Leite Moça</strong> e <strong>Nescau</strong> — simplicidade
              e dedicação em cada detalhe.
            </p>
          </div>
        </div>
      </article>

      {/* Card 2: O Brigadeiro */}
      <article className="rounded-xl border border-dourado-200 bg-cream-50 p-4 shadow-sm overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-dourado-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-dourado-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <div>
            <h3 className="font-display font-semibold text-coffee-base mb-1">O Segredo do Brigadeiro</h3>
            <p className="text-coffee-100 text-sm leading-relaxed">
              Ingredientes de qualidade: <strong>Leite Moça</strong> e <strong>Nescau</strong>.
              Nada de achocolatado comum — cada cliente merece o nosso melhor.
            </p>
          </div>
        </div>
      </article>

      {/* Card 3: Pilares */}
      <article className="rounded-xl border border-dourado-200 bg-cream-50 p-4 shadow-sm overflow-hidden">
        <h3 className="font-display font-semibold text-coffee-base mb-3">Nossos 3 Pilares</h3>
        <div className="grid gap-2">
          {[
            { n: 1, nome: 'Qualidade', desc: 'Produtos e preparo impecáveis.' },
            { n: 2, nome: 'Aconchego', desc: 'Ambiente onde o cliente se sente em casa.' },
            { n: 3, nome: 'Atendimento', desc: 'Nossa melhor atenção e carinho.' },
          ].map((p) => (
            <div
              key={p.n}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white border-l-4 border-dourado-base"
            >
              <span className="text-dourado-500 font-semibold text-sm">{p.n}</span>
              <div>
                <strong className="text-coffee-base text-sm">{p.nome}</strong>
                <span className="text-coffee-100 text-sm ml-1">— {p.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      {/* Card 4: Regra de Ouro */}
      <article className="rounded-xl border-2 border-dourado-base bg-dourado-50/50 p-4 shadow-sm">
        <p className="font-display font-semibold text-coffee-base text-center">
          &ldquo;Se o erro for nosso, o cliente não paga.&rdquo;
        </p>
        <p className="text-coffee-100 text-sm text-center mt-1">— Nossa regra de ouro</p>
      </article>
    </div>
  );
}
