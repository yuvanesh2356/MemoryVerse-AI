/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0B0E1A",
        surface: "rgba(255,255,255,0.04)",
        violet: { DEFAULT: "#8B5CF6", dim: "#6D28D9" },
        cyan: { DEFAULT: "#22D3EE", dim: "#0E7490" },
        amber: { DEFAULT: "#F5A623" },
        ink: "#F1F3F9",
        muted: "#94A3B8",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "aurora": "radial-gradient(60% 60% at 20% 20%, rgba(139,92,246,0.25), transparent 60%), radial-gradient(50% 50% at 80% 30%, rgba(34,211,238,0.2), transparent 60%), radial-gradient(60% 60% at 50% 90%, rgba(245,166,35,0.08), transparent 60%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(139,92,246,0.35)",
        "glow-cyan": "0 0 40px rgba(34,211,238,0.3)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-18px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
