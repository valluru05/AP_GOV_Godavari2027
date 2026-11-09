/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFF8EE', // Warm cream background
        surface: '#FFFFFF',    // White cards
        brand: {
          DEFAULT: '#8F2D16',  // Deep temple red
          hover: '#73200E',
          light: '#FDF2EB',
          subtle: '#FCE4CB',
        },
        saffron: {
          DEFAULT: '#E87512',  // Saffron orange
          hover: '#C9620B',
          light: '#FEF3E8',
          subtle: '#FCE4CB',
        },
        festivalGold: {
          DEFAULT: '#F4B942',  // Festival gold
          hover: '#E5A52A',
          light: '#FFF9ED',
          subtle: '#FCEECF',
        },
        templeRed: {
          DEFAULT: '#8F2D16',
          dark: '#5E1809',
          light: '#AB3A1F',
        },
        textPrimary: '#35251E',   // Primary text
        textSecondary: '#7C7168', // Secondary text
        textMuted: '#9B9188',
        borderLight: '#E9DED2',   // Borders
        borderMedium: '#D5C5B5',
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
          DEFAULT: '#C25E09',
          light: '#FFF7ED',
          border: '#FED7AA',
        },
        // Harmonize generic slate & blue into Godavari Pushkaralu visual identity
        slate: {
          50: '#FFFDF9',
          100: '#FAF4EC',
          200: '#E9DED2', // Exact border color
          300: '#D8C9BB',
          400: '#A89B8F',
          500: '#7C7168', // Exact secondary text
          600: '#5F544C',
          700: '#483E37',
          800: '#35251E', // Exact primary text
          900: '#231712',
          950: '#150D0A',
        },
        blue: {
          50: '#FDF2EB',
          100: '#FCE4CB',
          200: '#F7DDD0',
          300: '#F4B942',
          400: '#E87512',
          500: '#C25E09',
          600: '#8F2D16', // Primary temple red
          700: '#73200E',
          800: '#5E1809',
          900: '#451005',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(53, 37, 30, 0.05), 0 1px 2px 0 rgba(53, 37, 30, 0.03)',
        card: '0 1px 3px rgba(53, 37, 30, 0.06), 0 6px 16px -4px rgba(53, 37, 30, 0.04)',
        dropdown: '0 10px 25px -5px rgba(53, 37, 30, 0.12), 0 8px 10px -6px rgba(53, 37, 30, 0.08)',
        glow: '0 0 15px rgba(232, 117, 18, 0.35)',
      },
    },
  },
  plugins: [],
}
