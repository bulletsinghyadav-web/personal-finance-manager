/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F6F5F0',
          raised: '#FFFFFF',
          sunken: '#EDEBE3',
        },
        ink: {
          DEFAULT: '#12151A',
          soft: '#42474F',
          faint: '#767C86',
        },
        line: {
          DEFAULT: '#DAD7CC',
          strong: '#B9B5A7',
        },
        teal: {
          50: '#EAF5F2',
          100: '#CFE8E1',
          400: '#1D8F78',
          500: '#0E6E5D',
          600: '#0B5A4B',
          700: '#08453A',
        },
        brick: {
          50: '#FBEEEC',
          100: '#F2D2CC',
          400: '#C05B41',
          500: '#A6432E',
          600: '#833224',
        },
        amber: {
          400: '#C08A2E',
          500: '#A6741E',
        },
        night: {
          DEFAULT: '#12151A',
          raised: '#1A1E24',
          sunken: '#0C0E11',
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        lg: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 21, 26, 0.06)',
      },
    },
  },
  plugins: [],
};
