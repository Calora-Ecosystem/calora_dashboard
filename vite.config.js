import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import svgLoader from "vite-svg-loader";
import VueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [vue(), VueDevTools(), tailwindcss(), svgLoader()],
  server: {
    port: 7777,
  },
  assetsInclude: ["**/*.svg"],
});
