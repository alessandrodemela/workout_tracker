/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Space Grotesk"', 'Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    DEFAULT: '#D4FF00',
                    50: '#F9FFE5',
                    100: '#F4FFCC',
                    200: '#EAFF99',
                    300: '#DFFF66',
                    400: '#D4FF33',
                    500: '#D4FF00', // Our target neon lime
                    600: '#AACC00',
                    700: '#809900',
                    800: '#556600',
                    900: '#2A3300',
                    950: '#151A00',
                },
                dark: {
                    DEFAULT: '#000000',
                    foreground: '#FAFAFA',
                    card: '#0A0A0A',
                    border: '#171717',
                    accent: '#262626',
                    muted: '#A3A3A3',
                }
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'pulse-dot': {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.4', transform: 'scale(0.8)' },
                }
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-up': 'slide-up 0.4s ease-out',
                'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
