/** Banner quando a foto de perfil é obrigatória para continuar no portal. */
export function CompletarFotoPerfilBanner() {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border-2 border-dourado-base bg-gradient-to-br from-dourado-50 via-amber-50 to-cream-100 shadow-lg">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-dourado-base text-2xl text-cream-100 shadow"
            aria-hidden
          >
            📷
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-dourado-700">
                Complete seu cadastro
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-cafeteria-900 leading-tight mt-1">
                Coloque sua foto no perfil
              </h2>
              <p className="text-sm text-cafeteria-700 mt-2 leading-relaxed">
                Sua foto aparece no <strong>mural</strong>, nos <strong>rankings</strong> e no reconhecimento entre
                colegas. É obrigatória para usar o portal a partir de agora.
              </p>
            </div>

            <div className="rounded-xl border border-cafeteria-200/80 bg-white/90 px-4 py-3 text-sm text-cafeteria-800">
              <p className="font-medium text-cafeteria-900 mb-1">Como fazer no celular</p>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                <li>
                  Toque no botão <strong>«Escolher foto na galeria»</strong> abaixo.
                </li>
                <li>O celular abre suas fotos — escolha uma imagem sua com o rosto visível.</li>
                <li>Confirme. Quando a foto aparecer aqui, você já pode continuar no portal.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
