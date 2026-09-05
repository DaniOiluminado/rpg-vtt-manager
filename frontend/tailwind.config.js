/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        codice: {
          dark: '#386641',      // Verde escuro
          green: '#6A994E',     // Verde médio
          light: '#A7C957',     // Verde claro
          parchment: '#F2E8CF', // Bege/Pergaminho
          red: '#BC4749',       // Vermelho terroso
        }
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }, // Move metade para criar o loop contínuo
        }
      },
      animation: {
        ticker: 'ticker 40s linear infinite',
      }
    },
  },
  plugins: [],
};