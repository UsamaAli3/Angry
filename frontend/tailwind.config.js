/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cloud: "#F5F3FA",
        ink: "#3B3856",
        mist: "#8B87A3",
        bloom: "#E8798A",
        bloomDark: "#D2586B",
        calm: "#5FBDB0",
        calmDark: "#3E9C90",
        sunny: "#F3B95F",
      },
      fontFamily: {
        display: ["Baloo 2", "ui-rounded", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 8px 24px -8px rgba(59, 56, 86, 0.18)",
      },
    },
  },
  plugins: [],
};
