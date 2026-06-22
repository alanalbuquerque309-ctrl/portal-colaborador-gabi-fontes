import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          base: '#FDFBF7',
          50: '#fefdfb',
          100: '#FDFBF7',
          200: '#faf8f4',
          300: '#f5f0e8',
        },
        coffee: {
          base: '#3E2723',
          50: '#5d4037',
          100: '#4e342e',
          200: '#3e2723',
          300: '#2c1810',
        },
        dourado: {
          base: '#D4AF37',
          50: '#f5e6c8',
          100: '#ebd9a8',
          200: '#e0cc7a',
          300: '#d4af37',
          400: '#b8941f',
          500: '#8b6914',
        },
        portal: {
          bg: '#F9F7F2',
          rose: '#F5E4E6',
          roseHover: '#FCE8EC',
          ink: '#4B3621',
          inkMuted: '#5C4435',
          action: '#1a5c45',
          actionLight: '#e6f4ef',
          actionMuted: '#2d6b54',
        },
        cafeteria: {
          50: '#faf6f2',
          100: '#f5ede3',
          200: '#ead9c7',
          300: '#dcbfa3',
          400: '#c99d75',
          500: '#bd8559',
          600: '#af704e',
          700: '#925a41',
          800: '#774b39',
          900: '#3E2723',
          950: '#2c1810',
        },
        /* Acentos coesos com o calor da cafeteria — usar para diferenciar grupos/categorias. */
        terracota: {
          50: '#fdf3ee',
          100: '#fbe3d6',
          200: '#f6c3ac',
          300: '#ee9a76',
          400: '#e57148',
          500: '#d4522b',
          600: '#b53f21',
          700: '#94321d',
        },
        uva: {
          50: '#f7f3fb',
          100: '#ede2f6',
          200: '#dcc5ee',
          300: '#c29cdf',
          400: '#a572cc',
          500: '#8a4fb3',
          600: '#723f95',
          700: '#5c3279',
        },
        oceano: {
          50: '#eef7f9',
          100: '#d3ecf1',
          200: '#a6d7e2',
          300: '#70bccd',
          400: '#3f9db3',
          500: '#2b8197',
          600: '#23677b',
          700: '#1e5363',
        },
        mel: {
          50: '#fef8ec',
          100: '#fcecc8',
          200: '#f8d88c',
          300: '#f2bf4f',
          400: '#e9a31f',
          500: '#cf8612',
          600: '#a96710',
          700: '#855012',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-source-sans)', 'system-ui', 'sans-serif'],
        portal: ['var(--font-montserrat)', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'xicara-encher': {
          '0%': { transform: 'scaleY(0)' },
          '55%': { transform: 'scaleY(1)' },
          '75%': { transform: 'scaleY(1)' },
          '100%': { transform: 'scaleY(0)' },
        },
        'xicara-espuma': {
          '0%, 100%': { transform: 'translateY(68px)', opacity: '0' },
          '55%, 75%': { transform: 'translateY(0)', opacity: '1' },
        },
        'xicara-vapor': {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '40%': { transform: 'translateY(0)', opacity: '0.5' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
        'aniversario-confetti': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '0.9' },
          '100%': { transform: 'translateY(220px) rotate(540deg)', opacity: '0' },
        },
        'aniversario-balao-in': {
          '0%': { transform: 'translateY(24px) scale(0.96)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'logo-revelar-cor': {
          '0%, 100%': { filter: 'grayscale(1)', opacity: '0.42' },
          '50%': { filter: 'grayscale(0)', opacity: '1' },
        },
      },
      animation: {
        'xicara-encher': 'xicara-encher 2.4s ease-in-out infinite',
        'xicara-espuma': 'xicara-espuma 2.4s ease-in-out infinite',
        'xicara-vapor': 'xicara-vapor 2.4s ease-in-out infinite',
        'aniversario-confetti': 'aniversario-confetti 2.2s ease-out infinite',
        'aniversario-balao-in': 'aniversario-balao-in 0.35s ease-out forwards',
        'logo-revelar-cor': 'logo-revelar-cor 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
