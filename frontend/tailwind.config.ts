import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ld: {
          text: "#0B1220",
          title: "#0A2A4A",
          bg: "#FFFFFF",
          "card-light": "#EAF2FF",
          primary: "#1E88E5",
          secondary: "#00BCD4",
          gain: "#2ECC71",
          alert: "#FFC107",
          rare: "#7C4DFF",
          risk: "#FF4D8D",
          border: "#D7E3F5",
          muted: "#5F6B7A",
          soft: "#F6F9FE",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
