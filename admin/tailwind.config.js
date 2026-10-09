/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: { extend: { colors: { kobo: { gold: '#FFA500', dark: '#0A1F44', green: '#10B981' } } } },
  plugins: [],
};
