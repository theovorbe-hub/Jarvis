import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#05070a",
          900: "#0a0e14",
          800: "#0f151d",
          700: "#161d27",
          600: "#1e2733",
        },
        cyan: {
          50: "#e8fdff",
          100: "#c3f9ff",
          200: "#8ff2ff",
          300: "#4fe6fb",
          400: "#1fd3ee",
          500: "#00b8d4",
          600: "#0090ab",
          700: "#00728a",
        },
        electric: {
          400: "#5ac8ff",
          500: "#2e9dff",
          600: "#1c7ee0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(46, 157, 255, 0.35), 0 0 60px rgba(0, 184, 212, 0.15)",
        "glow-sm": "0 0 12px rgba(46, 157, 255, 0.35)",
        "inner-glow": "inset 0 0 30px rgba(46, 157, 255, 0.08)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.4)", opacity: "0" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        spinSlow: "spinSlow 8s linear infinite",
        spinSlower: "spinSlow 20s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
