/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#2e5559',
        },
        neutral: {
          50: '#faf8f5',
          100: '#f0ebe3',
          200: '#dcd4c8',
          400: '#a89f8e',
          600: '#756c5c',
          700: '#5c5447',
          800: '#4a4338',
          900: '#28241d',
        },
        success: {
          bg: '#eaf3de',
          text: '#173404',
        },
        warning: {
          bg: '#faeeda',
          text: '#412402',
        },
      },
      fontFamily: {
        jakarta: ['PlusJakartaSans_400Regular'],
        'jakarta-medium': ['PlusJakartaSans_500Medium'],
      },
    },
  },
  plugins: [],
};
