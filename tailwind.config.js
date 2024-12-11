/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#E11D48', // Rouge My Truck
                    hover: '#BE123C',
                    light: '#FEE2E2',
                },
                status: {
                    progress: {
                        text: '#B45309',
                        bg: '#FEF3C7',
                    },
                    waiting: {
                        text: '#1E40AF',
                        bg: '#DBEAFE',
                    },
                    completed: {
                        text: '#065F46',
                        bg: '#D1FAE5',
                    }
                }
            },
            borderRadius: {
                'xl': '1rem',
            }
        },
    },
    plugins: [],
}