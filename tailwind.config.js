/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#f8fafc', 
        'secondary': '#ffffff', 
        'accent': '#3879E8',
        'accent-hover': '#2f68c4',
        'highlight': '#f1f5f9',
        'text-primary': '#1a202c',
        'text-secondary': '#64748b',
        'border-color': 'rgba(0, 0, 0, 0.05)',
      },
      boxShadow: {
        'soft-subtle': '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'soft': '0 4px 12px 0 rgba(0, 0, 0, 0.07)',
        'soft-lg': '0 10px 25px 0 rgba(0, 0, 0, 0.07)',
        'glow-accent': '0 0 20px 0 rgba(56, 121, 232, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'zoom-in': 'zoomIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        zoomIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
