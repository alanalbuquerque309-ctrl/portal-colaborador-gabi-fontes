import { normalizePortalRole } from '@/lib/roles';
import { getTermo } from '@/lib/tenant/terminology';

export type AtalhoPerfil = { href: string; titulo: string; descricao: string };

export function montarAtalhosPerfil(
  role: string | null | undefined,
  podeVisitaRh: boolean,
  opts?: { graosVisivel?: boolean }
): AtalhoPerfil[] {
  const nr = normalizePortalRole(role);
  const lista: AtalhoPerfil[] = [];
  const graosVisivel = opts?.graosVisivel !== false;

  lista.push({
    href: '/portal/treinamento',
    titulo: 'Treinamento',
    descricao: `Vídeos da ${getTermo('quinta_treino')}, liderança e boas-vindas.`,
  });

  if (graosVisivel && (nr === 'colaborador' || nr === 'socio' || nr === 'admin')) {
    lista.push({
      href: '/portal/graos',
      titulo: getTermo('reconhecimento'),
      descricao:
        nr === 'colaborador'
          ? 'Missões da semana, saldo e resgate na cafeteria.'
          : 'Visualizar missões, catálogo e regras da gamificação.',
    });
  }
  if (nr === 'colaborador') {
    lista.push({
      href: '/portal/desempenho',
      titulo: 'Meu desempenho',
      descricao: 'Sua nota no mês e destaques da unidade.',
    });
  }
  if (nr === 'gerente' || nr === 'master' || nr === 'admin') {
    if (nr === 'admin') {
      lista.push({
        href: '/portal/avaliacao-master',
        titulo: 'Avaliação da equipe',
        descricao: 'Notas semanais (assiduidade, vestimenta, desempenho).',
      });
    }
    lista.push({
      href: '/portal/gerente-equipe',
      titulo: 'Equipe no mês',
      descricao: 'Visão da sua equipe no período.',
    });
    lista.push({
      href: '/portal/minha-lideranca',
      titulo: 'Minha liderança',
      descricao: 'Média por pilar e feedback de melhoria.',
    });
  }
  if (nr === 'colaborador' || nr === 'admin' || nr === 'rh') {
    lista.push({
      href: '/portal/avaliacao-lideranca',
      titulo: 'Avaliação de Liderança',
      descricao: 'Avalie seus líderes (pilares semanais).',
    });
  }
  if (podeVisitaRh) {
    lista.push({
      href: '/portal/avaliacao-rh-visita',
      titulo: 'Visita RH',
      descricao: 'Avaliação complementar na rede.',
    });
  }

  return lista;
}
