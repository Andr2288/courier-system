/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f7fc',
          100: '#b3e8f6',
          200: '#80d9f0',
          300: '#4dcae9',
          400: '#1abbe3',
          500: '#00a3e0',
          600: '#0082b3',
          700: '#006185',
          800: '#004057',
          900: '#001f2a',
        },
        ink: {
          DEFAULT: '#0f172a',
          muted: '#475569',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
