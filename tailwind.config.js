import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.tsx',
    './pages/**/*.tsx',
    './context/**/*.tsx',
    './lib/**/*.ts',
    './hooks/**/*.ts',
  ],
  safelist: [
    'grid-cols-1',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'grid-cols-5',
    'grid-cols-6',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: [
          'IvyOra Disp Reg',
          'IvyOra Disp Lt',
          'IvyOra Disp Thi',
          'sans-serif',
        ],
        body: [
          'GTPlanar',
          'GTPlanar Fallback',
          'sans-serif',
        ],
      },
      maxWidth: {
        '7xl': '88rem',
        '8xl': '88rem',
        site: '88rem',
      },
    },
  },
  plugins: [typography],
};
