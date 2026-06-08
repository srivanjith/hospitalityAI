/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        luxury: {
          dark: '#0b0f19',     // Rich deep midnight
          darkCard: '#131926', // Slightly lighter midnight for cards
          navy: '#0f172a',     // Slate navy
          slate: '#1e293b',    // Gray slate
          gold: '#d4af37',     // Polished gold
          goldDark: '#aa7c11', // Aged gold
          goldLight: '#f3e5ab',// Champagne
          cream: '#fafaf6',    // Soft light cream
          white: '#ffffff',    // Crisp white
          gray: '#f8fafc',     // Very light gray
          border: '#e2e8f0'    // Soft border gray
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        glassGold: '0 8px 32px 0 rgba(212, 175, 55, 0.08)',
        glow: '0 0 15px 3px rgba(212, 175, 55, 0.2)'
      }
    },
  },
  plugins: [],
}
