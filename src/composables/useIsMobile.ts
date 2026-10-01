import { onBeforeUnmount, onMounted, ref } from "vue";

const QUERY = "(max-width: 640px)";

/** Telefon kengligi (≤ 640px) — jadval ustunlari, pagination va pickerlarni soddalashtirish uchun. */
export function useIsMobile() {
  const mq = typeof window !== "undefined" ? window.matchMedia(QUERY) : null;
  const isMobile = ref(mq?.matches ?? false);
  const update = (e: MediaQueryListEvent) => (isMobile.value = e.matches);

  onMounted(() => mq?.addEventListener("change", update));
  onBeforeUnmount(() => mq?.removeEventListener("change", update));

  return isMobile;
}
