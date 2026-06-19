/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        cyan: '#00F0FF',
        magenta: '#FF2D78',
        space: {
          DEFAULT: '#0A0E1A',
          card: '#141B2D',
          light: '#1E2740',
        },
        mint: '#00FF88',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        noto: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        breathe: 'breathe 3s ease-in-out infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.8), 0 0 40px rgba(0, 240, 255, 0.3)' },
        },
        glow: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.3)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 5px #00F0FF, 0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-magenta': '0 0 5px #FF2D78, 0 0 20px rgba(255, 45, 120, 0.3)',
        'neon-mint': '0 0 5px #00FF88, 0 0 20px rgba(0, 255, 136, 0.3)',
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, #00F0FF 0%, #FF2D78 50%, #00FF88 100%)',
      },
    },
  },
  plugins: [],
};
