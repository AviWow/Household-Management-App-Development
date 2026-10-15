/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        urgent: {
          light: '#FEE2E2',
          border: '#F87171',
          text: '#B91C1C',
          bg: '#DC2626'
        },
        leisure: {
          light: '#FEF3C7',
          border: '#FBBF24',
          text: '#B45309',
          bg: '#D97706'
        },
        sometime: {
          light: '#E0E7FF',
          border: '#818CF8',
          text: '#4338CA',
          bg: '#4F46E5'
        }
      },
      fontFamily: {
        sans: ['Rubik', 'Assistant', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
