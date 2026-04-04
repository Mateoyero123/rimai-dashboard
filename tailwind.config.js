/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rimai: {
          50:  '#f0eeff',
          100: '#e4e0ff',
          200: '#ccc5ff',
          300: '#a99aff',
          400: '#8265ff',
          500: '#6240f5',
          600: '#4a25e8',
          700: '#3d1dcb',
          800: '#2e1699',  // logo purple
          900: '#1e0e66',
          950: '#130a44',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
