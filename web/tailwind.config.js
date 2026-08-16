/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00A14B',
          50: '#E8F7EE',
          100: '#C7ECD4',
          200: '#9BDBB4',
          300: '#6BCA93',
          400: '#43B86F',
          500: '#00A14B',
          600: '#009945',
          700: '#007A38',
          800: '#005C2B',
          900: '#003D1D',
        },
        safaricom: {
          green: '#00A14B',
          darkGreen: '#005C2B',
          deepGreen: '#003D1D',
          bright: '#43B02A',
          accent: '#4DDB7E',
        },
        accent: {
          DEFAULT: '#003D1D',
          dark: '#002912',
          light: '#0A1F12',
        },
        amber: {
          notice: '#FFF8E1',
          noticeBorder: '#FFD64A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 92, 43, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 92, 43, 0.15)',
        'brand-glow': '0 0 20px rgba(0, 161, 75, 0.25)',
      },
      backgroundImage: {
        'safaricom-gradient': 'linear-gradient(135deg, #003D1D 0%, #007A38 40%, #00A14B 100%)',
        'safaricom-light': 'linear-gradient(180deg, #E8F7EE 0%, #F7F8FA 100%)',
      },
    },
  },
  plugins: [],
};
