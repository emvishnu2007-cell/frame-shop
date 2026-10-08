/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#FAF7F2', 50: '#FDFCFA', 100: '#FAF7F2', 200: '#F3EDE3', 300: '#E9DFCF' },
        charcoal: { DEFAULT: '#1F1D1B', 700: '#2E2B28', 600: '#46423E', 500: '#6B665F', 400: '#948E85' },
        bronze: { DEFAULT: '#A8803F', 400: '#C09A5A', 500: '#A8803F', 600: '#8A6730', 700: '#6E5226' },
        beige: { DEFAULT: '#E8DCC8', 100: '#F1E9DA', 200: '#E8DCC8', 300: '#D9C9AB' },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(31,29,27,0.18)',
        card: '0 2px 12px rgba(31,29,27,0.06)',
      },
    },
  },
  plugins: [],
};
