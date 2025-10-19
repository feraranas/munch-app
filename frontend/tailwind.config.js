/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['source-code-pro', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
      },
      colors: {
        // Design System Colors
        lumen: {
          DEFAULT: '#F3F2F8',
          light: '#FAFAFE',
          dark: '#E8E6F0',
        },
        pulse: {
          DEFAULT: '#E0001B',
          light: '#FF1A38',
          dark: '#B30016',
          50: 'rgba(224, 0, 27, 0.05)',
          100: 'rgba(224, 0, 27, 0.1)',
        },
        sky: {
          DEFAULT: '#56ACEE',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E8E8EA',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },
        accent: {
          green: '#2528FF',
          'green-light': '#4A4DFF',
          'green-dark': '#1B1ECC',
        },
        // Semantic Colors
        success: {
          DEFAULT: '#10B981',
          bg: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: '#FEF3C7',
        },
        error: {
          DEFAULT: '#EF4444',
          bg: '#FEE2E2',
        },
        info: {
          DEFAULT: '#3B82F6',
          bg: '#DBEAFE',
        },
        // Legacy colors (keep for backwards compatibility)
        'primary': {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        'gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        'light-gray': '#F8F9FA',
        'addItem': '#9ca3af',
        'black': {
          '50': '#f1f1f1',
          '100': '#d7d7d7',
          '200': '#b0b0b0',
          '300': '#8b8b8b',
          '400': '#565656',
          '500': '#2a2a2a',
          '600': '#1a1a1a',
          '700': '#131313',
          '800': '#000000',
        }
      },
      spacing: {
        '0': '0',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',
      },
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'lg': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'xl': '0 8px 24px rgba(0, 0, 0, 0.12)',
        '2xl': '0 16px 48px rgba(0, 0, 0, 0.16)',
      },
      animation: {
        'pulse': 'pulse 1s infinite',
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-in': 'slideIn 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
      },
      keyframes: {
        pulse: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)'
          },
          '50%': {
            opacity: '0.5',
            transform: 'scale(1.1)'
          }
        },
        fadeIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(8px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        slideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-24px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        scaleIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)'
          }
        }
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '150ms',
        'slow': '200ms',
        'slower': '300ms',
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
