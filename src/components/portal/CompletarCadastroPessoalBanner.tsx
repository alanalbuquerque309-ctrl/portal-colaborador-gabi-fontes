/** Banner de destaque quando o cadastro pessoal é obrigatório para acessar o portal. */
export function CompletarCadastroPessoalBanner() {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border-2 border-dourado-base bg-gradient-to-br from-dourado-50 via-amber-50 to-cream-100 shadow-lg">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-dourado-base text-2xl text-cream-100 shadow"
            aria-hidden
          >
            ✋
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-dourado-700">
                Acesso ao portal
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-cafeteria-900 leading-tight mt-1">
                Complete suas informações pessoais para continuar
              </h2>
              <p className="text-sm text-cafeteria-700 mt-2 leading-relaxed">
                Antes de usar o portal, confirme ou preencha{' '}
                <strong>nome, e-mail, telefone, endereço e data de nascimento</strong>. Depois você
                precisará <strong>colocar sua foto no perfil</strong>. A{' '}
                <strong>data de admissão</strong> pode ser registrada depois pelo RH, caso você não saiba; os demais campos são
                obrigatórios agora.
              </p>
            </div>

            <div className="rounded-xl border border-cafeteria-200/80 bg-white/80 px-4 py-3 text-sm text-cafeteria-800">
              <p className="font-medium text-cafeteria-900 mb-1">Login e contato</p>
              <p className="leading-relaxed">
                O <strong>telefone</strong> e o <strong>e-mail</strong> informados aqui passam a ser seus dados
                oficiais de acesso e confirmação no portal. Se você alterar qualquer um deles, use o novo valor
                na próxima vez que entrar.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
              <p className="font-medium flex items-center gap-2 mb-1">
                <span aria-hidden>🔒</span>
                Privacidade e LGPD
              </p>
              <p className="leading-relaxed">
                Seus dados pessoais são usados apenas para gestão interna da equipe e comunicação com você.
                Conforme a <strong>LGPD</strong> (Lei nº 13.709/2018),{' '}
                <strong>somente Administração e RH</strong> da Gabi Fontes têm acesso a essas informações.
                Outros colaboradores não veem seu cadastro completo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
