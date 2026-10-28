/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: { 50: "#eef0ff", 100: "#dfe3ff", 500: "#2b36b8", 600: "#1c2599", 700: "#121a7a", 800: "#0a1063", 900: "#050a4a" },
        accent: { 500: "#6a4bc4", 600: "#5a3db0" },
      },
    },
  },
  plugins: [],
};
