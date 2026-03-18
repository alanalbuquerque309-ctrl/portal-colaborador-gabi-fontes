'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCpf, validateCpf } from '@/lib/utils/cpf';
import { LoginForm } from '@/components/auth/LoginForm';
import { setPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

const BYPASS_CPF = '05376259765';
const BYPASS_SENHA = 'Alan030813.';

function LoginContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (cpf: string, senha?: string) => {
    setError(null);
    const cleanCpf = cpf.replace(/\D/g, '').trim().padStart(11, '0');
    const senhaTrim = (senha ?? '').trim();

    // CPF Alan + senha → API cadastra/atualiza e entra direto (sem formulário)
    const ehCpfAlan = cleanCpf === BYPASS_CPF;
    if (ehCpfAlan && senhaTrim === BYPASS_SENHA) {
      try {
        const res = await fetch('/api/login/alan-entrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf: BYPASS_CPF }),
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok && data.colaborador) {
          setPortalSession(data.colaborador.id, data.colaborador.unidade_id, data.colaborador.role || 'socio');
          router.push('/portal');
          return;
        }
        setError(data.erro || 'Erro ao entrar. Tente novamente.');
      } catch {
        setError('Erro de conexão. Verifique a internet e tente novamente.');
      }
      return;
    }
    if (ehCpfAlan && senhaTrim) {
      setError('Senha incorreta. Tente novamente.');
      return;
    }

    if (!validateCpf(cleanCpf)) {
      setError('CPF inválido. Verifique os dígitos.');
      return;
    }

    const supabase = createClient();
    let colaborador: { id: string; unidade_id: string; onboarding_completo: boolean; role?: string } | null = null;
    let fetchError: { message?: string } | null = null;

    const res = await supabase
      .from('colaboradores')
      .select('id, cpf, unidade_id, onboarding_completo, role')
      .eq('cpf', cleanCpf)
      .single();
    colaborador = res.data;
    fetchError = res.error;

    if (fetchError && cleanCpf === BYPASS_CPF) {
      const autoRes = await fetch('/api/login/auto-cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCpf }),
      });
      const autoData = await autoRes.json();
      if (autoData.ok && autoData.colaborador) {
        colaborador = {
          id: autoData.colaborador.id,
          unidade_id: autoData.colaborador.unidade_id,
          onboarding_completo: true,
          role: autoData.colaborador.role,
        };
        fetchError = null;
      }
    }

    if (fetchError || !colaborador) {
      setError(cleanCpf === BYPASS_CPF
        ? 'CPF não cadastrado. Use a senha para acesso direto.'
        : 'CPF não cadastrado. Entre em contato com o RH.');
      return;
    }

    if (!colaborador.onboarding_completo) {
      router.push(`/onboarding?colaborador_id=${colaborador.id}&unidade_id=${colaborador.unidade_id}`);
      return;
    }

    const role = (colaborador as { role?: string }).role;
    setPortalSession(colaborador.id, colaborador.unidade_id, role);
    router.push('/portal');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100">
      <LoginForm
        onSubmit={handleLogin}
        error={error}
        formatCpf={formatCpf}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream-100"><XicaraCarregando size="lg" label="Carregando…" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
