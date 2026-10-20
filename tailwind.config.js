/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rail: {
          900: '#0B132B',
          800: '#1C2541',
          700: '#233256',
          600: '#3A506B',
          500: '#4A6572',
          accent: '#00C896',
          warning: '#F5A623',
          danger: '#FF4D4D',
          info: '#4EA8DE',
        }
      }
    },
  },
  plugins: [],
}

