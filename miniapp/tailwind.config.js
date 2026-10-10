/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kobo: {
          gold: '#FFA500',
          orange: '#FF6B00',
          dark: '#0A1F44',
          deep: '#061530',
          green: '#10B981',
          danger: '#EF4444',
        },
      },
    },
  },
  plugins: [],
};
