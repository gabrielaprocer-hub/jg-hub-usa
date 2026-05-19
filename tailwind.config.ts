import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}','./components/**/*.{js,ts,jsx,tsx}','./lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        brand: { DEFAULT: '#0A0A0A', light: '#F5F5F7' },
      },
      animation: { pulse2: 'pulse2 2s infinite' },
      keyframes: { pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } } },
    },
  },
  plugins: [],
}
export default config
