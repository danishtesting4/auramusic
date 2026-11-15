/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        md: {
          primary: 'rgb(var(--md-primary) / <alpha-value>)',
          'on-primary': 'rgb(var(--md-on-primary) / <alpha-value>)',
          'primary-container': 'rgb(var(--md-primary-container) / <alpha-value>)',
          'on-primary-container': 'rgb(var(--md-on-primary-container) / <alpha-value>)',
          secondary: 'rgb(var(--md-secondary) / <alpha-value>)',
          'secondary-container': 'rgb(var(--md-secondary-container) / <alpha-value>)',
          'on-secondary-container': 'rgb(var(--md-on-secondary-container) / <alpha-value>)',
          tertiary: 'rgb(var(--md-tertiary) / <alpha-value>)',
          surface: 'rgb(var(--md-surface) / <alpha-value>)',
          'surface-dim': 'rgb(var(--md-surface-dim) / <alpha-value>)',
          'surface-container-low': 'rgb(var(--md-surface-container-low) / <alpha-value>)',
          'surface-container': 'rgb(var(--md-surface-container) / <alpha-value>)',
          'surface-container-high': 'rgb(var(--md-surface-container-high) / <alpha-value>)',
          'surface-container-highest': 'rgb(var(--md-surface-container-highest) / <alpha-value>)',
          'on-surface': 'rgb(var(--md-on-surface) / <alpha-value>)',
          'on-surface-variant': 'rgb(var(--md-on-surface-variant) / <alpha-value>)',
          outline: 'rgb(var(--md-outline) / <alpha-value>)',
          'outline-variant': 'rgb(var(--md-outline-variant) / <alpha-value>)',
        }
      },
      borderRadius: {
        'm3-xs': '4px',
        'm3-sm': '8px',
        'm3-md': '12px',
        'm3-lg': '16px',
        'm3-xl': '28px',
        'm3-full': '9999px',
      },
      animation: {
        'spin-slow': 'spin 18s linear infinite',
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
