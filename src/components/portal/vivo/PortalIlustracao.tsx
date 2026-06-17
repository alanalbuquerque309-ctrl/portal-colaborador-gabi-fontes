/** SVGs leves (sem PNG) — identidade “portal vivo”. */
export function IlustracaoCafe({ className = 'w-24 h-24' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 100" fill="none" aria-hidden>
      <ellipse cx="60" cy="88" rx="42" ry="6" fill="#D4AF37" fillOpacity="0.25" />
      <path d="M28 38c0-14 14-22 32-22s32 8 32 22v28H28V38z" fill="#774b39" />
      <path d="M34 66h52v8c0 6-10 10-26 10s-26-4-26-10v-8z" fill="#925a41" />
      <path
        d="M92 44h8c6 0 10 4 10 10s-4 10-10 10h-8"
        stroke="#774b39"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="60" cy="42" rx="22" ry="8" fill="#F5E6C8" />
      <path
        d="M48 36c4-6 10-8 12-8s8 2 12 8"
        stroke="#faf6f2"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="44" cy="28" r="3" fill="#D4AF37" fillOpacity="0.6" />
      <circle cx="52" cy="22" r="2" fill="#D4AF37" fillOpacity="0.4" />
    </svg>
  );
}

export function IlustracaoGraos({ className = 'w-28 h-20' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 90" fill="none" aria-hidden>
      <ellipse cx="70" cy="78" rx="50" ry="7" fill="#1a5c45" fillOpacity="0.12" />
      <ellipse cx="45" cy="50" rx="14" ry="20" fill="#5d4037" transform="rotate(-25 45 50)" />
      <ellipse cx="70" cy="48" rx="16" ry="22" fill="#774b39" />
      <ellipse cx="95" cy="52" rx="13" ry="19" fill="#4e342e" transform="rotate(20 95 52)" />
      <path
        d="M55 28c8-12 20-14 30-8 6 4 8 10 6 16-2 8-12 14-24 12"
        stroke="#1a5c45"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="62" cy="22" r="4" fill="#D4AF37" fillOpacity="0.7" />
    </svg>
  );
}

export function IlustracaoMegafone({ className = 'w-28 h-24' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 100" fill="none" aria-hidden>
      <path d="M18 42h28l34-18v52L46 58H18V42z" fill="#D4AF37" />
      <path d="M46 58l8 22c2 6-2 10-8 8l-6-18" fill="#b8941f" />
      <path
        d="M78 32c12 6 18 14 18 22s-6 16-18 22"
        stroke="#1a5c45"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M86 26c16 8 24 20 24 34s-8 26-24 34"
        stroke="#1a5c45"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="92" cy="28" r="4" fill="#f5e6c8" stroke="#D4AF37" strokeWidth="1.5" />
    </svg>
  );
}

export function IlustracaoTrofeu({ className = 'w-24 h-24' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden>
      <path d="M30 18h40v12c0 14-8 24-20 28S30 44 30 30V18z" fill="#D4AF37" />
      <path d="M38 46h24v8H38v-8z" fill="#b8941f" />
      <rect x="32" y="54" width="36" height="10" rx="2" fill="#925a41" />
      <path
        d="M22 22h12v8c0 6-4 10-10 10h-2V22zM66 22h12v8c0 6 4 10 10 10h2V22z"
        fill="#ebd9a8"
      />
      <circle cx="50" cy="32" r="6" fill="#faf6f2" stroke="#b8941f" strokeWidth="1.5" />
    </svg>
  );
}

/** Ramo de café — decoração nos cantos (estilo mockup). */
export function IlustracaoRamoCafe({
  className = 'w-24 h-24',
  espelhar = false,
}: {
  className?: string;
  espelhar?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden
      style={espelhar ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M8 72 C20 58, 28 42, 36 28 C44 14, 52 8, 62 4"
        stroke="#6B4423"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M36 28 C32 22, 26 18, 18 16"
        stroke="#6B4423"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M44 20 C48 14, 54 10, 62 8"
        stroke="#6B4423"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="14" cy="14" rx="9" ry="5" fill="#1a5c45" transform="rotate(-35 14 14)" />
      <ellipse cx="22" cy="10" rx="8" ry="4.5" fill="#22704f" transform="rotate(-20 22 10)" />
      <ellipse cx="32" cy="24" rx="10" ry="5.5" fill="#1a5c45" transform="rotate(-55 32 24)" />
      <ellipse cx="40" cy="16" rx="9" ry="5" fill="#2d8659" transform="rotate(-40 40 16)" />
      <ellipse cx="50" cy="10" rx="8" ry="4.5" fill="#1a5c45" transform="rotate(-25 50 10)" />
      <ellipse cx="58" cy="6" rx="7" ry="4" fill="#22704f" transform="rotate(-15 58 6)" />
      <ellipse cx="18" cy="20" rx="7" ry="4" fill="#2d8659" transform="rotate(-50 18 20)" />
    </svg>
  );
}
