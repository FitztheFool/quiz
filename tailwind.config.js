/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/lib/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                gray: colors.stone,
                // ── Brand "Kwizar" — amber / brass primary ──
                primary: {
                    50: '#fdf6ec',
                    100: '#f9e7c9',
                    200: '#f2cd91',
                    300: '#eab059',
                    400: '#e29632',
                    500: '#d97706',
                    600: '#bd6306',
                    700: '#9a5009',
                    800: '#7c400d',
                    900: '#67360f',
                },
                // ── Felt green (multiplayer / success accents) ──
                felt: {
                    50: '#edf7f1',
                    100: '#d2ebdc',
                    200: '#a7d7bb',
                    300: '#72bd94',
                    400: '#449d6e',
                    500: '#2a8054',
                    600: '#1f6b47',
                    700: '#1a553a',
                    800: '#174330',
                    900: '#133829',
                },
                // ── Clay / terracotta (third accent) ──
                clay: {
                    50: '#fbf0ed',
                    100: '#f6dad2',
                    200: '#ecb6a8',
                    300: '#df8d78',
                    400: '#cf6750',
                    500: '#b45441',
                    600: '#9a4435',
                    700: '#7d372c',
                    800: '#652f27',
                    900: '#552a24',
                },
            },
            fontFamily: {
                sans: ['var(--font-body)', 'sans-serif'],
                display: ['var(--font-heading)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
