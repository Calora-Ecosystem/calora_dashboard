import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./views/router";

import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./style.css";

import { vMaska } from "maska/vue";

import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

import SvgIcon from "./components/SvgIcon.vue";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(App);

app.use(ElementPlus);
app.use(router);
app.use(pinia);

app.directive("maska", vMaska);

app.component("svg-icon", SvgIcon);

app.mount("#app");
