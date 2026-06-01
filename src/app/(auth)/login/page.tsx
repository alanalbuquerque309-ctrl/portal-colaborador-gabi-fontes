'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatTelefoneBr, normalizeTelefoneLogin, telefoneLoginValido } from '@/lib/telefone';
import { normalizeEmail } from '@/lib/password';
import { LoginForm } from '@/components/auth/LoginForm';
import { salvarUltimoLogin } from '@/lib/portal-remember-login';
import { getPortalSession, setPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

async function processarRespostaLogin(
  data: Record<string, unknown>,
  loginCanonical: string,
  router: ReturnType<typeof useRouter>,
  manterLogado: boolean
): Promise<boolean> {
  const sessaoOpts = { persistent: manterLogado };

  if (data.mustCompleteCpf === true && data.colaborador && typeof data.colaborador === 'object') {
    const c = data.colaborador as { id: string; unidade_id: string; role?: string };
    setPortalSession(c.id, c.unidade_id, c.role, sessaoOpts);
    salvarUltimoLogin(loginCanonical, manterLogado);
    router.push('/completar-cpf');
    return true;
  }

  if (data.redirect && typeof data.redirect === 'string') {
    if (data.colaborador && typeof data.colaborador === 'object') {
      const c = data.colaborador as { id: string; unidade_id: string; role?: string };
      setPortalSession(c.id, c.unidade_id, c.role, sessaoOpts);
    }
    salvarUltimoLogin(loginCanonical, manterLogado);
    router.push(data.redirect);
    return true;
  }

  return false;
}

function LoginContent() {
  const router = useRouter();
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [primeiraSenha, setPrimeiraSenha] = useState(false);
  const [trocaObrigatoria, setTrocaObrigatoria] = useState(false);
  const [loginPrimeiraSenha, setLoginPrimeiraSenha] = useState('');

  useEffect(() => {
    const s = getPortalSession();
    if (s?.colaboradorId && s.colaboradorId !== 'pending') {
      router.replace('/portal');
      return;
    }
    setVerificandoSessao(false);
  }, [router]);

  const handleTrocarSenhaObrigatoria = async (
    login: string,
    senhaAtual: string,
    senhaNova: string,
    senhaConfirmacao: string,
    opts?: { manterLogado: boolean }
  ) => {
    setError(null);
    try {
      const res = await fetch('/api/login/trocar-senha-obrigatoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          login,
          senha_atual: senhaAtual,
          senha_nova: senhaNova,
          senha_confirmacao: senhaConfirmacao,
          manter_logado: opts?.manterLogado !== false,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.erro || 'Não foi possível alterar a senha.');
        return;
      }
      const ok = await processarRespostaLogin(
        data as Record<string, unknown>,
        login,
        router,
        opts?.manterLogado !== false
      );
      if (!ok) {
        setError('Erro ao entrar após alterar a senha.');
      }
    } catch {
      setError('Erro de conexão. Verifique a internet e tente novamente.');
    }
  };

  const handleLogin = async (
    login: string,
    senha?: string,
    senhaConfirmacao?: string,
    opts?: { manterLogado: boolean }
  ) => {
    setError(null);
    const manterLogado = opts?.manterLogado !== false;

    if (primeiraSenha) {
      const loginClean = (login || loginPrimeiraSenha).trim();
      const s1 = (senha ?? '').trim();
      const s2 = (senhaConfirmacao ?? '').trim();
      try {
        const res = await fetch('/api/login/primeira-senha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            login: loginClean,
            senha: s1,
            senhaConfirmacao: s2,
            manter_logado: manterLogado,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.erro || 'Não foi possível definir a senha.');
          return;
        }
        const ok = await processarRespostaLogin(
          data,
          String(data.login ?? loginClean),
          router,
          manterLogado
        );
        if (!ok) {
          setError('Erro ao entrar após definir a senha.');
        }
      } catch {
        setError('Erro de conexão. Verifique a internet e tente novamente.');
      }
      return;
    }

    const loginTrim = login.trim();
    const loginCanonical = loginTrim.includes('@')
      ? normalizeEmail(loginTrim)
      : normalizeTelefoneLogin(loginTrim);
    const senhaTrim = (senha ?? '').trim();

    if (
      !loginCanonical ||
      (!loginTrim.includes('@') && !telefoneLoginValido(loginCanonical))
    ) {
      setError('Informe um celular válido com DDD ou um e-mail válido.');
      return;
    }

    try {
      const res = await fetch('/api/login/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login: loginCanonical, senha: senhaTrim, manter_logado: manterLogado }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.erro || 'Login não cadastrado. Entre em contato com o RH.');
        return;
      }

      if (data.needsPassword === true) {
        setLoginPrimeiraSenha(String(data.login ?? loginCanonical));
        setPrimeiraSenha(true);
        setTrocaObrigatoria(false);
        return;
      }

      if (data.mustChangePassword === true) {
        setLoginPrimeiraSenha(String(data.login ?? loginCanonical));
        setTrocaObrigatoria(true);
        setPrimeiraSenha(false);
        return;
      }

      const ok = await processarRespostaLogin(
        data as Record<string, unknown>,
        String(data.login ?? loginCanonical),
        router,
        manterLogado
      );
      if (!ok) {
        setError('Erro ao entrar. Tente novamente.');
      }
    } catch {
      setError('Erro de conexão. Verifique a internet e tente novamente.');
    }
  };

  if (verificandoSessao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <XicaraCarregando size="lg" label="Verificando sessão…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream-100 px-4 py-8">
      <LoginForm
        onSubmit={handleLogin}
        onTrocarSenhaObrigatoria={handleTrocarSenhaObrigatoria}
        error={error}
        formatTelefone={formatTelefoneBr}
        mode={
          trocaObrigatoria ? 'trocar_senha_obrigatoria' : primeiraSenha ? 'primeira_senha' : 'login'
        }
        loginBloqueado={loginPrimeiraSenha}
      />
      {(primeiraSenha || trocaObrigatoria) && (
        <button
          type="button"
          onClick={() => {
            setPrimeiraSenha(false);
            setTrocaObrigatoria(false);
            setLoginPrimeiraSenha('');
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
