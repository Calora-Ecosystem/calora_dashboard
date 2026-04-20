import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import svgLoader from "vite-svg-loader";
import VueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), VueDevTools(), tailwindcss(), svgLoader()],
  server: {
    port: 7777,
  },
  assetsInclude: ["**/*.svg"],
});
