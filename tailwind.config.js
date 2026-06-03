/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        xs: "420px",
      },
      colors: {
        // Refined editorial-Americana palette: deeper ink navy, paper cream,
        // brick red, ink blue. Less primary-flag and more vintage almanac.
        ink: {
          50: "#F4EFE2", // paper cream
          100: "#EDE5D2",
          200: "#D9CDB1",
          300: "#A39977",
          500: "#5C5A52",
          700: "#2A2C36",
          800: "#161B2D",
          900: "#0B1226", // ink navy
        },
        brick: {
          300: "#FF6B7A", // for dark-mode small text (high contrast on ink-900)
          400: "#C84856",
          500: "#A1212C", // primary accent (light mode)
          600: "#891721",
          700: "#6E1219",
        },
        flagblue: {
          400: "#3D5A88",
          500: "#1E3A5F", // ink blue
          600: "#16304E",
          700: "#0E2238",
        },
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', "Impact", "system-ui", "sans-serif"],
        sans: ['"Barlow Condensed"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        "huge": "0.22em",
      },
    },
  },
  plugins: [],
};
