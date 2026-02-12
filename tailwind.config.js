import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.tsx', './pages/**/*.tsx', './context/**/*.tsx', './lib/**/*.ts', './hooks/**/*.ts'],
  safelist: [
    'grid-cols-1',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'grid-cols-5',
    'grid-cols-6',
  ],
  theme: { extend: {} },
  plugins: [typography],
};
