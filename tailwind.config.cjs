/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './frontend/index.html',
    './frontend/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0058bc',
          dark: '#0b1c30',
          green: '#006c49',
          mint: '#6cf8bb',
          light: '#f8f9ff',
          soft: '#d8e2ff',
          card: '#eff4ff',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
