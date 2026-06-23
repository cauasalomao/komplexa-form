import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        navy: { DEFAULT: "#0E1E35", deep: "#081525" },
        kblue: "#1670C3",
        kcyan: "#24D5FF",
        ktxt: "#4A5770",
        kgray: "#8896A8",
        kbdr: "#DDE3ED",
        kbg: "#F3F6FA",
        kpage: "#EEF1F6",
        success: { DEFAULT: "#16A34A", soft: "rgba(22,163,74,.10)" },
        warn: { DEFAULT: "#EB8B50", soft: "rgba(235,139,80,.12)" },
        danger: { DEFAULT: "#DC2626", soft: "rgba(220,38,38,.10)" },
      },
      backgroundImage: {
        "k-grad": "linear-gradient(90deg,#1670C3 0%,#1099E9 48%,#24D5FF 100%)",
        "k-radial":
          "radial-gradient(circle at 70% 50%,rgba(36,213,255,.35) 0%,transparent 60%)",
      },
      borderRadius: { lg: "12px", md: "10px", sm: "8px" },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down .2s ease-out",
        "accordion-up": "accordion-up .2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
