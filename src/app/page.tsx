import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cream-200 via-cream-100 to-cafeteria-100 p-6">
      <div className="text-center max-w-lg">
        <h1 className="font-display text-4xl md:text-5xl text-cafeteria-800 mb-4">
          Portal do Colaborador
        </h1>
        <p className="text-cafeteria-700 text-lg mb-8">
          Gabi Fontes · Cultura e Comunicação Interna
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3 bg-cafeteria-600 text-cream-50 rounded-lg font-medium hover:bg-cafeteria-700 transition-colors"
        >
          Entrar com CPF
        </Link>
        <p className="mt-6">
          <Link
            href="/admin"
            className="inline-block px-6 py-2 border-2 border-cafeteria-600 text-cafeteria-700 rounded-lg font-medium hover:bg-cafeteria-600 hover:text-cream-50 transition-colors"
          >
            Acesso administrativo
          </Link>
        </p>
      </div>
    </main>
  );
}
