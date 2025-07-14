/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./contexts/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FAF8F5', // Soft Warm Off-White (Main card/modal backgrounds)
        secondary: '#EAE0D5',  // Muted Dusty Rose/Light Clay (Secondary elements, borders)
        accent: '#15686e',     // Deep Teal (Primary CTAs, highlights)
        'accent-dark': '#115054', // Darker shade for accent hover
        background: '#F8F7F4',  // Slightly off-white/very light grey (Page background) - Changed from FDFBF8
        textOnDark: '#FFFFFF',  // White for text on dark/accent backgrounds - Changed from FBFBF5 for better contrast
        textOnLight: '#3C3633', // Dark Warm Grey (Main text)
        textDarker: '#2D2A28',  // Even Darker Warm Grey (For headings or higher emphasis text)
        highlight: '#B07259',     // Earthy Terracotta (Secondary accents, special callouts)
        subtleBlue: '#A0AEC0',   // Muted Blue-Gray (Informational icons, tertiary text)
        danger: '#D9534F',      // Standard danger color
        success: '#5CB85C',    // Standard success color
        warning: '#F0AD4E'     // Standard warning color
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 2px 4px rgba(0,0,0,0.05)',
        'card': '0 4px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 6px 16px rgba(0,0,0,0.1)',
        'modal': '0 10px 30px rgba(0,0,0,0.15)',
        'top-lg': '0 -10px 15px -3px rgba(0, 0, 0, 0.05), 0 -4px 6px -2px rgba(0, 0, 0, 0.03)', // For sticky bottom nav
      },
      borderRadius: {
        'xl': '0.75rem', // Default is 0.5rem, making modals/cards a bit rounder
        '2xl': '1rem',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
       keyframes: {
          modalShow: { 
            '0%': { transform: 'scale(0.95) translateY(10px)', opacity: '0' }, 
            '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
          },
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUpFadeIn: {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          }
        },
        animation: {
          modalShow: 'modalShow 0.3s ease-out forwards',
          fadeIn: 'fadeIn 0.5s ease-in-out',
          slideUpFadeIn: 'slideUpFadeIn 0.4s ease-out',
        }
    }
  },
  plugins: [],
}
