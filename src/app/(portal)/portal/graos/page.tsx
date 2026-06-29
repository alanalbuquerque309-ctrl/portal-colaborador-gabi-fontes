import { GraosPageClient } from '@/components/portal/GraosPageClient';
import { tituloPaginaTenant } from '@/lib/tenant/branding';
import { getTermo } from '@/lib/tenant/terminology';

export const metadata = {
  title: tituloPaginaTenant(getTermo('reconhecimento')),
};

export default function GraosPage() {
  return <GraosPageClient />;
}
