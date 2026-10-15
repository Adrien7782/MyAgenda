/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-el': 'var(--surface-el)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        'flux-text': 'var(--text)',
        'text-muted': 'var(--text-muted)',
        sidebar: 'var(--sidebar)',
        chrome: 'var(--chrome)',
      },
    },
  },
  plugins: [],
};
