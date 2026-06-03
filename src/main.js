import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./views/router";

import ElementPlus from "element-plus";
import uzUz from "element-plus/es/locale/lang/uz-uz";

import "element-plus/dist/index.css";
import "./style.css";

import { vMaska } from "maska/vue";

import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

import SvgIcon from "./components/shared/SvgIcon.vue";

import Vue3Lottie from "vue3-lottie";

import { i18n } from "./i18n";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(App);

app.use(ElementPlus, { locale: uzUz });
app.use(pinia);
app.use(router);
app.use(Vue3Lottie);
app.use(i18n);

app.directive("maska", vMaska);

app.component("svg-icon", SvgIcon);

app.mount("#app");
