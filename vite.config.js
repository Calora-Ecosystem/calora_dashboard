import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import svgLoader from "vite-svg-loader";
import VueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [
    vue(),
    VueDevTools(),
    tailwindcss(),
    svgLoader({
      // Keep the viewBox so SVGs (e.g. the brand logo) scale correctly
      svgoConfig: {
        plugins: [
          {
            name: "preset-default",
            params: { overrides: { removeViewBox: false } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 7777,
  },
  assetsInclude: ["**/*.svg"],
});
