// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f0c29",
        accent: "#ff00cc",
        glass: "rgba(255, 255, 255, 0.05)",
      },
      boxShadow: {
        neon: "0 0 10px #ff00cc, 0 0 20px #ff00cc",
      },
      backdropBlur: {
        glass: "10px",
      },
    },
  },
  plugins: [],
}
