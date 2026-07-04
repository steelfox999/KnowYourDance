/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kioskBg: 'var(--color-bg)',
        kioskSurface: 'var(--color-surface)',
        kioskInk: 'var(--color-ink)',
        kioskAccent: 'var(--color-accent)',
        kioskAccent2: 'var(--color-accent-2)',
        kioskMuted: 'var(--color-muted)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      animation: {
        'spin-slow': 'spin 180s linear infinite',
      }
    },
  },
  plugins: [],
}
