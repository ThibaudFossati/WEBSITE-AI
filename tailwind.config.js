/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"PP Editorial New"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        cream: '#f8f6f2',
        ink: '#0a0a0a',
      },
    },
  },
  plugins: [],
}
