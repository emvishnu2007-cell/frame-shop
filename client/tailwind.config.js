/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'dusty-pink': '#F0DCE1',
        cream: { DEFAULT: '#FBF7F1', 50: '#FEFCF9', 100: '#FBF7F1', 200: '#F4EDE5', 300: '#EDE1D8' },
        charcoal: { DEFAULT: '#581D32', 700: '#6E2A40', 600: '#84465B', 500: '#9B6D7C', 400: '#B997A2' },
        bronze: { DEFAULT: '#C88F9F', 400: '#D5A7B4', 500: '#C88F9F', 600: '#B77589', 700: '#9F5D72' },
        beige: { DEFAULT: '#E9D7DA', 100: '#F4E9E9', 200: '#E9D7DA', 300: '#D7B8C0' },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(88,29,50,0.18)',
        card: '0 2px 12px rgba(88,29,50,0.07)',
      },
    },
  },
  plugins: [],
};
