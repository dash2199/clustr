import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Fira Code"', "monospace"],
      },
      colors: {
        bg: {
          DEFAULT: "#000000",
          secondary: "#0a0a0a",
          tertiary: "#111111",
          elevated: "#1a1a1a",
        },
        border: "#2a2a2a",
        text: {
          DEFAULT: "#eeeeee",
          secondary: "#b0b0b0",
          muted: "#707070",
        },
        green: "#4ade80",
        claude: "#c4a67a",
        codex: "#10b981",
      },
    },
  },
  plugins: [],
};

export default config;
