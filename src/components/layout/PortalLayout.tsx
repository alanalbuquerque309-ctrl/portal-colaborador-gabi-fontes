'use client';

import { Header } from './Header';
import { BotaoAjuda } from '@/components/ajuda/BotaoAjuda';
import { isPendingRegistration } from '@/lib/utils/session';
import { CompleteRegistrationForm } from '@/components/portal/CompleteRegistrationForm';

export function PortalLayout({ children }: { children: React.ReactNode }) {
  if (isPendingRegistration()) {
    return (
      <div className="min-h-screen bg-cream-100">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:pb-8">
          <CompleteRegistrationForm />
        </main>
        <BotaoAjuda />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-cream-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:pb-8">
        {children}
      </main>
      <BotaoAjuda />
    </div>
  );
}
