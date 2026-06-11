import { defineStore } from "pinia";
import { ref, watch } from "vue";

type ThemeMode = "light" | "dark";

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = mode;
};

export const useThemeStore = defineStore(
  "theme",
  () => {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;

    const mode = ref<ThemeMode>(prefersDark ? "dark" : "light");

    const toggle = () => {
      mode.value = mode.value === "dark" ? "light" : "dark";
    };

    const set = (value: ThemeMode) => {
      mode.value = value;
    };

    const init = () => applyTheme(mode.value);

    watch(mode, (value) => applyTheme(value), { immediate: true });

    return { mode, toggle, set, init };
  },
  {
    persist: {
      key: "theme",
    },
  },
);
