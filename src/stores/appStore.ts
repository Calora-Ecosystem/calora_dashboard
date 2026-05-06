import { defineStore } from "pinia";
import { ref } from "vue";

export const useAppStore = defineStore("app", () => {
  const isLoading = ref(false);
  const isMobileMenuOpen = ref(false);

  return {
    isLoading,
    isMobileMenuOpen,
  };
});
