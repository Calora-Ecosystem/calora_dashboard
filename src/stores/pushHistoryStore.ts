import { defineStore } from "pinia";
import { ref } from "vue";
import type { SentPushRecord } from "../@types/pushHistory";

// Dashboarddan yuborilgan push'lar tarixi (lokal, persisted). Har bir
// yuborish sahifasi (broadcast / segment / manual) muvaffaqiyatli
// yuborgach `record()` chaqiradi.
export const usePushHistoryStore = defineStore(
  "push_history",
  () => {
    const history = ref<SentPushRecord[]>([]);

    const record = (
      entry: Omit<SentPushRecord, "id" | "createdAt"> &
        Partial<Pick<SentPushRecord, "createdAt">>,
    ): SentPushRecord => {
      const rec: SentPushRecord = {
        id: `push_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: entry.createdAt ?? new Date().toISOString(),
        title: entry.title,
        description: entry.description,
        image: entry.image ?? null,
        audienceType: entry.audienceType,
        audienceLabel: entry.audienceLabel,
        recipientCount: entry.recipientCount,
        scheduled: entry.scheduled ?? null,
      };
      history.value = [rec, ...history.value];
      return rec;
    };

    const remove = (id: string) => {
      history.value = history.value.filter((r) => r.id !== id);
    };

    const clear = () => {
      history.value = [];
    };

    return { history, record, remove, clear };
  },
  { persist: true },
);
