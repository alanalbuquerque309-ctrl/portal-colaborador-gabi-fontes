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
    <svg className={className} viewBox="0 0 128 128" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mf-cone" x1="18" y1="52" x2="92" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C9A227" />
          <stop offset="35%" stopColor="#F0D78C" />
          <stop offset="55%" stopColor="#E8C547" />
          <stop offset="100%" stopColor="#9A7420" />
        </linearGradient>
        <linearGradient id="mf-cone-inner" x1="44" y1="40" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#5C4510" />
        </linearGradient>
        <linearGradient id="mf-grip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A3728" />
          <stop offset="50%" stopColor="#2E2118" />
          <stop offset="100%" stopColor="#1A120C" />
        </linearGradient>
        <linearGradient id="mf-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5EED6" />
          <stop offset="100%" stopColor="#B89850" />
        </linearGradient>
        <filter id="mf-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3E2723" floodOpacity="0.22" />
        </filter>
        <filter id="mf-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* sombra no chão */}
      <ellipse cx="52" cy="112" rx="28" ry="5" fill="#3E2723" fillOpacity="0.12" />

      {/* ondas de som (estáticas; animação no wrapper) */}
      <g className="mf-ondas" opacity="0.85">
        <path
          d="M96 44c10 4 16 12 16 20s-6 16-16 20"
          stroke="#15803D"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M104 36c14 6 22 16 22 28s-8 22-22 28"
          stroke="#15803D"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
        <path
          d="M112 28c18 8 28 22 28 36s-10 28-28 36"
          stroke="#15803D"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
      </g>

      <g filter="url(#mf-shadow)">
        {/* corpo / cone */}
        <path
          d="M24 48 L24 80 L52 92 L96 72 L96 56 L52 36 Z"
          fill="url(#mf-cone)"
        />
        {/* borda interna do cone */}
        <path
          d="M52 40 L88 58 L88 70 L52 84 Z"
          fill="url(#mf-cone-inner)"
          fillOpacity="0.55"
        />
        {/* brilho no cone */}
        <path
          d="M30 52 L48 44 L48 76 L30 76 Z"
          fill="#FFF8E7"
          fillOpacity="0.35"
        />
        {/* aro da boca */}
        <ellipse cx="94" cy="64" rx="5" ry="14" fill="url(#mf-rim)" stroke="#8B6914" strokeWidth="1" />
        <ellipse cx="94" cy="64" rx="2.5" ry="9" fill="#2E2118" fillOpacity="0.5" />

        {/* garganta / pescoço */}
        <path d="M24 48 L24 80 L36 76 L36 52 Z" fill="#6B4423" />
        <path d="M24 52 L36 50 L36 54 L24 56 Z" fill="#FFF8E7" fillOpacity="0.2" />

        {/* empunhadura */}
        <rect x="14" y="54" width="14" height="28" rx="4" fill="url(#mf-grip)" />
        <rect x="16" y="58" width="3" height="20" rx="1.5" fill="#FFF8E7" fillOpacity="0.12" />
        <rect x="23" y="58" width="2" height="20" rx="1" fill="#000" fillOpacity="0.15" />

        {/* botão / gatilho */}
        <circle cx="21" cy="78" r="3.5" fill="#C9A227" stroke="#8B6914" strokeWidth="0.8" />
        <circle cx="20.5" cy="77.5" r="1.2" fill="#FFF8E7" fillOpacity="0.5" />

        {/* detalhe verde marca (café) */}
        <path
          d="M56 58 L68 52 L68 68 L56 74 Z"
          fill="#15803D"
          fillOpacity="0.85"
        />
        <path d="M58 60 L66 56 L66 66 L58 70 Z" fill="#22C55E" fillOpacity="0.35" />
      </g>
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
