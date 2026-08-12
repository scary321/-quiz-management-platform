/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#12151C", soft: "#39404E", faint: "#6B7385" },
        paper: "#F1F3F8",
        rule: "#DCE0EC",
        mark: { DEFAULT: "#2A3BE0", dark: "#1D2AB8", wash: "#E9EBFD" },
        pass: { DEFAULT: "#0F7B5A", wash: "#E4F3ED" },
        fail: { DEFAULT: "#C42B1C", wash: "#FBE9E7" },
        warn: { DEFAULT: "#B57A00", wash: "#FBF1DC" },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,21,28,0.04), 0 8px 24px -16px rgba(18,21,28,0.35)",
      },
      borderRadius: { card: "10px" },
    },
  },
  plugins: [],
};
