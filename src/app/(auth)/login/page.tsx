'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCpf, validateCpf } from '@/lib/utils/cpf';
import { LoginForm } from '@/components/auth/LoginForm';
import { setPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

async function processarRespostaLogin(
  data: Record<string, unknown>,
  cleanCpf: string,
  senhaTrim: string,
  router: ReturnType<typeof useRouter>
): Promise<boolean> {
  if (data.action === 'socio_admin') {
    const skipRes = await fetch('/api/login/entrar-socio-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: cleanCpf, senha: senhaTrim }),
      credentials: 'include',
    });
    const skipData = await skipRes.json();
    if (skipData.ok) {
      router.push('/portal');
      return true;
    }
    return false;
  }

  if (data.redirect && typeof data.redirect === 'string') {
    if (data.colaborador && typeof data.colaborador === 'object') {
      const c = data.colaborador as { id: string; unidade_id: string; role?: string };
      setPortalSession(c.id, c.unidade_id, c.role);
    }
    router.push(data.redirect);
    return true;
  }

  return false;
}

function LoginContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [primeiraSenha, setPrimeiraSenha] = useState(false);
  const [trocaObrigatoria, setTrocaObrigatoria] = useState(false);
  const [cpfPrimeiraSenha, setCpfPrimeiraSenha] = useState('');

  const handleTrocarSenhaObrigatoria = async (
    cpf: string,
    senhaAtual: string,
    senhaNova: string,
    senhaConfirmacao: string
  ) => {
    setError(null);
    try {
      const res = await fetch('/api/login/trocar-senha-obrigatoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cpf,
          senha_atual: senhaAtual,
          senha_nova: senhaNova,
          senha_confirmacao: senhaConfirmacao,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.erro || 'Não foi possível alterar a senha.');
        return;
      }
      const ok = await processarRespostaLogin(data as Record<string, unknown>, cpf, senhaNova, router);
      if (!ok) {
        setError('Erro ao entrar após alterar a senha.');
      }
    } catch {
      setError('Erro de conexão. Verifique a internet e tente novamente.');
    }
  };

  const handleLogin = async (cpf: string, senha?: string, senhaConfirmacao?: string) => {
    setError(null);

    if (primeiraSenha) {
      const clean = cpf.replace(/\D/g, '').trim().padStart(11, '0');
      const s1 = (senha ?? '').trim();
      const s2 = (senhaConfirmacao ?? '').trim();
      try {
        const res = await fetch('/api/login/primeira-senha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            cpf: clean || cpfPrimeiraSenha,
            senha: s1,
            senhaConfirmacao: s2,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.erro || 'Não foi possível definir a senha.');
          return;
        }
        const ok = await processarRespostaLogin(data, clean || cpfPrimeiraSenha, s1, router);
        if (!ok) {
          setError('Erro ao entrar após definir a senha.');
        }
      } catch {
        setError('Erro de conexão. Verifique a internet e tente novamente.');
      }
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, '').trim().padStart(11, '0');
    const senhaTrim = (senha ?? '').trim();

    if (!validateCpf(cleanCpf)) {
      setError('CPF inválido. Verifique os dígitos.');
      return;
    }

    try {
      const res = await fetch('/api/login/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cpf: cleanCpf, senha: senhaTrim }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.erro || 'CPF não cadastrado. Entre em contato com o RH.');
        return;
      }

      if (data.needsPassword === true) {
        setCpfPrimeiraSenha(cleanCpf);
        setPrimeiraSenha(true);
        setTrocaObrigatoria(false);
        return;
      }

      if (data.mustChangePassword === true) {
        setCpfPrimeiraSenha(cleanCpf);
        setTrocaObrigatoria(true);
        setPrimeiraSenha(false);
        return;
      }

      const ok = await processarRespostaLogin(
        data as Record<string, unknown>,
        cleanCpf,
        senhaTrim,
        router
      );
      if (!ok) {
        setError('Erro ao entrar. Tente novamente.');
      }
    } catch {
      setError('Erro de conexão. Verifique a internet e tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream-100 px-4 py-8">
      <LoginForm
        onSubmit={handleLogin}
        onTrocarSenhaObrigatoria={handleTrocarSenhaObrigatoria}
        error={error}
        formatCpf={formatCpf}
        mode={
          trocaObrigatoria ? 'trocar_senha_obrigatoria' : primeiraSenha ? 'primeira_senha' : 'login'
        }
        cpfBloqueado={cpfPrimeiraSenha}
      />
      {(primeiraSenha || trocaObrigatoria) && (
        <button
          type="button"
          onClick={() => {
            setPrimeiraSenha(false);
            setTrocaObrigatoria(false);
            setCpfPrimeiraSenha('');
            setError(null);
          }}
          className="mt-4 text-sm text-cafeteria-600 hover:text-cafeteria-800 underline"
        >
          Voltar ao login
        </button>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cream-100">
          <XicaraCarregando size="lg" label="Carregando…" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
