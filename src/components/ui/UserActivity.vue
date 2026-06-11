<script setup lang="ts">
import { computed, onMounted } from "vue";
import Card from "./Card.vue";
import { useDashboardStore } from "../../stores/dashboardStore";

const dashboardStore = useDashboardStore();

onMounted(async () => {
  await dashboardStore.loadOverallSummary();
});

const totalUsers = computed(() => dashboardStore.overallSummary?.totalUsers ?? 0);
const signupGrowth = computed(
  () => dashboardStore.overallSummary?.totalUsersGrows ?? 0,
);

// Estimated engagement until backend exposes activity endpoints
const mau = computed(() => Math.round(totalUsers.value * 0.62));
const dau = computed(() => Math.round(mau.value * 0.34));
const stickiness = computed(() =>
  mau.value ? Math.round((dau.value / mau.value) * 100) : 0,
);

const tiles = computed(() => [
  { label: "DAU", value: dau.value.toLocaleString(), hint: "Kunlik faol", color: "var(--brand-strong)" },
  { label: "MAU", value: mau.value.toLocaleString(), hint: "Oylik faol", color: "var(--info)" },
  { label: "Stickiness", value: stickiness.value + "%", hint: "DAU / MAU", color: "var(--purple)" },
]);

// 7-day activity (illustrative, stable shape relative to DAU)
const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const factors = [0.78, 0.85, 0.92, 0.88, 1, 0.7, 0.62];
const week = computed(() => factors.map((f) => Math.round(dau.value * f)));
const weekMax = computed(() => Math.max(...week.value, 1));
</script>

<template>
  <Card title="Foydalanuvchi faolligi" subtitle="Mahsulot bilan o'zaro aloqa">
    <template #actions>
      <span
        class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
        style="background: var(--warning-soft); color: var(--warning)"
        title="Taxminiy — aniqlik uchun DAU/MAU backend endpointi kerak"
      >~ taxminiy</span>
    </template>

    <!-- tiles -->
    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="t in tiles"
        :key="t.label"
        class="p-3.5 rounded-2xl"
        style="background: var(--surface-2); border: 1px solid var(--border)"
      >
        <p class="text-[12px] font-semibold" style="color: var(--text-muted)">{{ t.label }}</p>
        <p class="text-[19px] font-bold mt-1.5 leading-none" :style="{ color: t.color }">{{ t.value }}</p>
        <p class="text-[11px] mt-1.5" style="color: var(--text-faint)">{{ t.hint }}</p>
      </div>
    </div>

    <!-- weekly activity bars -->
    <div class="mt-6">
      <p class="text-[13.5px] font-semibold mb-3" style="color: var(--text)">Haftalik faollik</p>
      <div class="flex items-end justify-between gap-2 h-[120px]">
        <div v-for="(v, i) in week" :key="i" class="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
          <span class="text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--text-muted)">{{ v }}</span>
          <div
            class="w-full rounded-lg transition-all duration-300"
            :style="{
              height: (v / weekMax) * 100 + '%',
              background: i === 4 ? 'linear-gradient(180deg, var(--brand), var(--brand-strong))' : 'var(--surface-hover)',
            }"
          ></div>
          <span class="text-[11px]" style="color: var(--text-faint)">{{ days[i] }}</span>
        </div>
      </div>
    </div>

    <!-- new signups footer -->
    <div
      class="mt-5 flex items-center justify-between p-3.5 rounded-2xl"
      style="background: var(--surface-2); border: 1px solid var(--border)"
    >
      <div class="flex items-center gap-2.5">
        <span class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: var(--brand-soft); color: var(--brand-strong)">
          <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </span>
        <div>
          <p class="text-[13px] font-semibold" style="color: var(--text)">Yangi foydalanuvchilar</p>
          <p class="text-[11.5px]" style="color: var(--text-faint)">Kechagiga nisbatan o'sish</p>
        </div>
      </div>
      <span
        class="text-[14px] font-bold"
        :style="{ color: signupGrowth >= 0 ? 'var(--success)' : 'var(--danger)' }"
      >
        {{ signupGrowth >= 0 ? "+" : "" }}{{ signupGrowth }}%
      </span>
    </div>
  </Card>
</template>
