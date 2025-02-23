/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        dark: {
          bg: '#1a1b1e',
          card: '#25262b',
          border: '#2C2E33',
          text: '#C1C2C5',
          heading: '#FFFFFF'
        }
      },
    },
  },
  plugins: [],
}