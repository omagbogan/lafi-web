/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070B14',
          900: '#0B1120',
          850: '#0E172B',
          800: '#15203B',
          700: '#1E293B',
        },
        electric: {
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
        },
        pastel: {
          purple: '#F3E8FF',
          green: '#ECFDF5',
          blue: '#E0F2FE',
          pink: '#FDF2F8',
          yellow: '#FEF3C7',
        }
      },
      fontFamily: {
        sans: ['Gabarito', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
