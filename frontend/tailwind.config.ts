import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0D14',
        surface: '#131823',
        nav: '#0F131C',
        border: 'rgba(255, 255, 255, 0.08)',
        ink: '#F9FAFB',
        secondary: '#9CA3AF',
        muted: '#6B7280',
        cyan: '#00D2FE',
        emerald: '#00E599',
        warning: '#F59E0B',
        danger: '#EF4444',
        accent: {
          DEFAULT: '#6E56CF',
          hover: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
