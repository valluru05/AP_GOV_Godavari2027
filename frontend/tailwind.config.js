/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F7FA',
        surface: '#FFFFFF',
        brand: {
          DEFAULT: '#174EA6',
          hover: '#133E85',
          light: '#E8F0FE',
          subtle: '#D2E3FC',
        },
        secondary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
        },
        tealAccent: {
          DEFAULT: '#0F9488',
          hover: '#0D7B71',
          light: '#F0FDFA',
        },
        textPrimary: '#172B4D',
        textSecondary: '#64748B',
        textMuted: '#94A3B8',
        borderLight: '#E2E8F0',
        borderMedium: '#CBD5E1',
        govSuccess: {
          DEFAULT: '#15803D',
          light: '#F0FDF4',
          border: '#BBF7D0',
        },
        govWarning: {
          DEFAULT: '#B45309',
          light: '#FFFBEB',
          border: '#FDE68A',
        },
        govError: {
          DEFAULT: '#B91C1C',
          light: '#FEF2F2',
          border: '#FECACA',
        },
        govInfo: {
          DEFAULT: '#0369A1',
          light: '#F0F9FF',
          border: '#BAE6FD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        card: '0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 15px -5px rgba(0, 0, 0, 0.02)',
        dropdown: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
