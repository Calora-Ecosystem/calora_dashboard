<script setup lang="ts">
import { computed, onMounted } from "vue";
import Card from "./Card.vue";
import { useDashboardStore } from "../../stores/dashboardStore";

const dashboardStore = useDashboardStore();

onMounted(async () => {
  await dashboardStore.loadUserStatistics();
});

const stats = computed(() => dashboardStore.userStatistics);

const dau = computed(() => stats.value?.activeToday ?? 0);
const wau = computed(() => stats.value?.activeThisWeek ?? 0);
const mau = computed(() => stats.value?.activeThisMonth ?? 0);
const stickiness = computed(() =>
  mau.value ? Math.round((dau.value / mau.value) * 100) : 0,
);

const newToday = computed(() => stats.value?.newToday ?? 0);
const newTodayGrows = computed(() => stats.value?.newTodayGrows ?? 0);

const tiles = computed(() => [
  { label: "DAU", value: dau.value.toLocaleString(), hint: "Kunlik faol", color: "var(--brand-strong)" },
  { label: "WAU", value: wau.value.toLocaleString(), hint: "Haftalik faol", color: "var(--info)" },
  { label: "MAU", value: mau.value.toLocaleString(), hint: "Oylik faol", color: "var(--purple)" },
]);

// Oxirgi 7 kunlik faollik (real backend — kunlik faol foydalanuvchilar).
const weekdayNames = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
const lastWeek = computed(() => {
  const series = stats.value?.dailyActiveUsers ?? [];
  return series.slice(-7).map((d) => {
    const date = new Date(d.date);
    return { label: weekdayNames[date.getDay()], value: d.count };
  });
});
const weekMax = computed(() => Math.max(...lastWeek.value.map((d) => d.value), 1));
const todayIdx = computed(() => lastWeek.value.length - 1);
</script>

<template>
  <Card title="Foydalanuvchi faolligi" subtitle="Ilovadan foydalanish (SignLog)">
    <template #actions>
      <span
        class="text-[11px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap"
        style="background: var(--success-soft); color: var(--success)"
      >real ma'lumot</span>
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

    <div class="mt-3 flex items-center justify-between px-1">
      <span class="text-[12px]" style="color: var(--text-faint)">Stickiness (DAU / MAU)</span>
      <span class="text-[13px] font-bold" style="color: var(--purple)">{{ stickiness }}%</span>
    </div>

    <!-- weekly activity bars -->
    <div class="mt-5">
      <p class="text-[13.5px] font-semibold mb-3" style="color: var(--text)">Oxirgi 7 kunlik faollik</p>
      <div class="flex items-end justify-between gap-2 h-[120px]">
        <div v-for="(d, i) in lastWeek" :key="i" class="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
          <span class="text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--text-muted)">{{ d.value }}</span>
          <div
            class="w-full rounded-lg transition-all duration-300"
            :style="{
              height: (d.value / weekMax) * 100 + '%',
              minHeight: d.value > 0 ? '4px' : '0',
              background: i === todayIdx ? 'linear-gradient(180deg, var(--brand), var(--brand-strong))' : 'var(--surface-hover)',
            }"
          ></div>
          <span class="text-[11px]" style="color: var(--text-faint)">{{ d.label }}</span>
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
          <p class="text-[13px] font-semibold" style="color: var(--text)">Bugungi yangi foydalanuvchilar</p>
          <p class="text-[11.5px]" style="color: var(--text-faint)">{{ newToday }} ta · kechagiga nisbatan</p>
        </div>
      </div>
      <span
        class="text-[14px] font-bold"
        :style="{ color: newTodayGrows >= 0 ? 'var(--success)' : 'var(--danger)' }"
      >
        {{ newTodayGrows >= 0 ? "+" : "" }}{{ newTodayGrows }}%
      </span>
    </div>
  </Card>
</template>
