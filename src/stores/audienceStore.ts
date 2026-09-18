import { defineStore } from "pinia";
import { ref } from "vue";
import { axios } from "../integrations/axios";
import { useApiCallStore } from "./apiCallStore";
import type {
  ActivityKey,
  AudienceUser,
  GenderKey,
  PlanKey,
  SavedSegment,
  SegmentFilter,
} from "../@types/audience";

const DAY_MS = 24 * 60 * 60 * 1000;

// Yoshi birthDate dan hisoblanadi (detail.extra.age serverda ba'zan 0 keladi).
const computeAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  // Kelajakdagi yoki noto'g'ri sana => yosh yo'q.
  if (age < 0 || age > 120) return null;
  return age;
};

const daysSince = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY_MS);
};

// Bitta detail javobini yengil segment yozuviga aylantiradi.
const toAudienceUser = (d: any): AudienceUser => {
  const extra = d?.extra ?? null;
  const sub = d?.subscription ?? null;
  const plan: PlanKey =
    sub && sub.isActive && sub.plan ? (sub.plan as PlanKey) : "Free";
  return {
    id: d.id,
    name: d.name ?? null,
    gender: (extra?.gender as GenderKey) ?? null,
    age: computeAge(extra?.birthDate ?? null),
    activityLevel: (extra?.activityLevel as ActivityKey) ?? null,
    purpose: extra?.purpose ?? null,
    plan,
    isPremium: plan !== "Free",
    signInCount: d.signInCount ?? 0,
    lastSignInAt: d.lastSignInAt ?? null,
    daysSinceLastSignIn: daysSince(d.lastSignInAt ?? null),
    createdAt: d.createdAt ?? null,
    hasProfile: !!extra?.gender || extra?.birthDate != null || !!extra?.activityLevel,
  };
};

// Bir foydalanuvchi filtrga mos keladimi (sof funksiya).
export const userMatchesFilter = (
  u: AudienceUser,
  f: SegmentFilter,
): boolean => {
  if (f.genders.length && (!u.gender || !f.genders.includes(u.gender)))
    return false;
  if (f.ageMin != null && (u.age == null || u.age < f.ageMin)) return false;
  if (f.ageMax != null && (u.age == null || u.age > f.ageMax)) return false;
  if (
    f.activityLevels.length &&
    (!u.activityLevel || !f.activityLevels.includes(u.activityLevel))
  )
    return false;
  if (f.plans.length && !f.plans.includes(u.plan)) return false;

  if (f.engagement === "active") {
    // Doimiy: oxirgi N kunda kirgan bo'lishi shart.
    if (u.daysSinceLastSignIn == null) return false;
    if (u.daysSinceLastSignIn > f.activeWithinDays) return false;
  } else if (f.engagement === "dormant") {
    // Uxlab qolgan: umuman kirmagan (null) yoki N+ kun kirmagan.
    if (u.daysSinceLastSignIn != null && u.daysSinceLastSignIn < f.dormantAfterDays)
      return false;
  }
  return true;
};

// Cheklangan parallellik bilan promise'larni bajaruvchi oddiy pool.
const runPool = async <T, R>(
  items: T[],
  size: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: () => void,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runNext = async (): Promise<void> => {
    const i = cursor++;
    if (i >= items.length) return;
    try {
      results[i] = await worker(items[i], i);
    } finally {
      onProgress?.();
      await runNext();
    }
  };
  const starters = Array.from({ length: Math.min(size, items.length) }, runNext);
  await Promise.all(starters);
  return results;
};

export const useAudienceStore = defineStore(
  "audience",
  () => {
    const { execute } = useApiCallStore();

    // ── Snapshot (segmentlash uchun boyitilgan foydalanuvchilar) ──────
    const snapshot = ref<AudienceUser[]>([]);
    const snapshotLoadedAt = ref<number | null>(null);
    const loading = ref(false);
    const progress = ref<{ loaded: number; total: number }>({ loaded: 0, total: 0 });

    // Barcha foydalanuvchi ID larini sahifalab olib keladi.
    const fetchAllIds = async (): Promise<number[]> => {
      const pageSize = 500;
      let skip = 0;
      let total = Infinity;
      const ids: number[] = [];
      while (skip < total) {
        const { data } = await axios.get("/users", {
          params: {
            Skip: skip,
            Take: pageSize,
            SortPropName: "id",
            SortDirection: "Ascending",
          },
          paramsSerializer: { indexes: null },
        });
        const rows: any[] = data?.content ?? [];
        ids.push(...rows.map((r) => r.id));
        total = typeof data?.total === "number" ? data.total : ids.length;
        if (!rows.length) break;
        skip += pageSize;
      }
      return ids;
    };

    // Snapshotni to'liq qayta quradi. Har bir foydalanuvchi uchun detail
    // chaqiriladi (jins/yosh/faollik/engagement faqat shu yerda bor).
    const loadSnapshot = async (force = false): Promise<void> => {
      if (loading.value) return;
      // 10 daqiqadan yangi snapshot bo'lsa qayta yuklamaymiz.
      if (
        !force &&
        snapshotLoadedAt.value &&
        Date.now() - snapshotLoadedAt.value < 10 * 60 * 1000 &&
        snapshot.value.length
      )
        return;

      loading.value = true;
      progress.value = { loaded: 0, total: 0 };
      try {
        await execute(async () => {
          const ids = await fetchAllIds();
          progress.value = { loaded: 0, total: ids.length };
          const users = await runPool(
            ids,
            8,
            async (id) => {
              try {
                const { data } = await axios.get(
                  `/dashboard/users/${id}/detail`,
                  { silent: true } as any,
                );
                return data?.content ? toAudienceUser(data.content) : null;
              } catch {
                return null;
              }
            },
            () => {
              progress.value = {
                loaded: progress.value.loaded + 1,
                total: progress.value.total,
              };
            },
          );
          snapshot.value = users.filter((u): u is AudienceUser => u != null);
          snapshotLoadedAt.value = Date.now();
        });
      } finally {
        loading.value = false;
      }
    };

    // Filtrni snapshotga qo'llab, mos foydalanuvchilar va ID larni qaytaradi.
    const resolve = (
      filter: SegmentFilter,
    ): { users: AudienceUser[]; ids: number[] } => {
      const users = snapshot.value.filter((u) => userMatchesFilter(u, filter));
      return { users, ids: users.map((u) => u.id) };
    };

    // ── Saqlangan segmentlar ("push listlari") ────────────────────────
    const savedSegments = ref<SavedSegment[]>([]);

    const saveSegment = (name: string, filter: SegmentFilter): SavedSegment => {
      const seg: SavedSegment = {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        filter: JSON.parse(JSON.stringify(filter)),
        createdAt: new Date().toISOString(),
      };
      savedSegments.value = [seg, ...savedSegments.value];
      return seg;
    };

    const updateSegment = (id: string, patch: Partial<SavedSegment>) => {
      savedSegments.value = savedSegments.value.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      );
    };

    const removeSegment = (id: string) => {
      savedSegments.value = savedSegments.value.filter((s) => s.id !== id);
    };

    return {
      snapshot,
      snapshotLoadedAt,
      loading,
      progress,
      loadSnapshot,
      resolve,
      savedSegments,
      saveSegment,
      updateSegment,
      removeSegment,
    };
  },
  {
    // Faqat saqlangan segmentlarni persist qilamiz — katta snapshotni emas.
    persist: { pick: ["savedSegments"] },
  },
);
