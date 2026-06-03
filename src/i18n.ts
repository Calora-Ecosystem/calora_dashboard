import { createI18n } from "vue-i18n";
import uz from "./locales/uz.json";

export const i18n = createI18n({
  legacy: false,
  locale: "uz",
  fallbackLocale: "uz",
  messages: {
    uz,
  },
});
