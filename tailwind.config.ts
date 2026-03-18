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
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-source-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'xicara-encher': {
          '0%': { transform: 'translateY(100%) scaleY(0)' },
          '15%': { transform: 'translateY(100%) scaleY(0.15)' },
          '40%': { transform: 'translateY(100%) scaleY(0.55)' },
          '70%': { transform: 'translateY(100%) scaleY(0.9)' },
          '85%': { transform: 'translateY(100%) scaleY(0.95)' },
          '100%': { transform: 'translateY(100%) scaleY(0)' },
        },
      },
      animation: {
        'xicara-encher': 'xicara-encher 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
