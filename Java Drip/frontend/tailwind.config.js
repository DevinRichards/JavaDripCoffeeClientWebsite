/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'tertiary-container': '#a9a8ff',
        'inverse-surface': '#3b3d40',
        'brand-charcoal': '#3b3d40',
        'brand-charcoal-deep': '#323437',
        'brand-charcoal-muted': '#505357',
        'surface-container-low': '#f0f1f1',
        'tertiary': '#504eb6',
        'outline-variant': '#acadad',
        'secondary-container': '#fcc9df',
        'surface-container-high': '#e1e3e3',
        'surface-variant': '#dbdddd',
        'outline': '#767777',
        'on-tertiary-container': '#221c8a',
        'primary': '#b30065',
        'secondary-fixed-dim': '#edbcd1',
        'on-error': '#ffefef',
        'surface': '#f6f6f6',
        'on-background': '#2d2f2f',
        'inverse-on-surface': '#9c9d9d',
        'on-surface-variant': '#5a5c5c',
        'primary-dim': '#9d0058',
        'surface-container-highest': '#dbdddd',
        'on-secondary-fixed-variant': '#6f495b',
        'surface-container-lowest': '#ffffff',
        'on-error-container': '#510017',
        'on-tertiary-fixed-variant': '#2c2892',
        'on-primary-fixed-variant': '#5c0031',
        'surface-bright': '#f6f6f6',
        'secondary-fixed': '#fcc9df',
        'surface-tint': '#b30065',
        'on-tertiary-fixed': '#0a0060',
        'primary-container': '#ff6ea9',
        'on-surface': '#2d2f2f',
        'secondary': '#775062',
        'primary-fixed-dim': '#ff4e9e',
        'on-primary-fixed': '#2d2f2f',
        'surface-dim': '#d3d5d5',
        'on-tertiary': '#f4f1ff',
        'background': '#f6f6f6',
        'tertiary-dim': '#4341aa',
        'on-primary': '#ffeff2',
        'error-container': '#f74b6d',
        'on-secondary': '#ffeff3',
        'secondary-dim': '#6a4556',
        'error-dim': '#a70138',
        'inverse-primary': '#ff479c',
        'error': '#b41340',
        'tertiary-fixed': '#a9a8ff',
        'tertiary-fixed-dim': '#9999ff',
        'on-primary-container': '#4b0027',
        'on-secondary-fixed': '#502d3e',
        'primary-fixed': '#ff6ea9',
        'surface-container': '#e7e8e8',
        'on-secondary-container': '#654051'
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem'
      },
      fontFamily: {
        headline: ['Epilogue', 'sans-serif'],
        body: ['Be Vietnam Pro', 'sans-serif'],
        label: ['Epilogue', 'sans-serif']
      },
      boxShadow: {
        editorial: '0 20px 40px rgba(45,47,47,0.06)'
      }
    }
  },
  plugins: []
};
