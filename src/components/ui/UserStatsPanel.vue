<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";
import Card from "./Card.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useThemeStore } from "../../stores/themeStore";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();

onMounted(async () => {
  await dashboardStore.loadUserStatistics();
});

const s = computed(() => dashboardStore.userStatistics);

// ── Statistika kartochkalari ──────────────────────────────────────
const cards = computed(() => [
  {
    label: "Bugun yangi",
    value: s.value?.newToday ?? 0,
    grows: s.value?.newTodayGrows ?? 0,
    hint: "kechagiga nisbatan",
    color: "var(--brand-strong)",
    bg: "var(--brand-soft)",
  },
  {
    label: "Shu hafta yangi",
    value: s.value?.newThisWeek ?? 0,
    grows: s.value?.newThisWeekGrows ?? 0,
    hint: "o'tgan haftaga nisbatan",
    color: "var(--info)",
    bg: "var(--info-soft)",
  },
  {
    label: "Shu oy yangi",
    value: s.value?.newThisMonth ?? 0,
    grows: s.value?.newThisMonthGrows ?? 0,
    hint: "o'tgan oyga nisbatan",
    color: "var(--purple)",
    bg: "var(--purple-soft)",
  },
  {
    label: "Jami foydalanuvchilar",
    value: s.value?.totalUsers ?? 0,
    grows: null,
    hint: "ro'yxatdan o'tganlar",
    color: "var(--text)",
    bg: "var(--surface-hover)",
  },
]);

// ── Faollik va obuna mini-ko'rsatkichlari ─────────────────────────
const miniStats = computed(() => [
  { label: "DAU", value: s.value?.activeToday ?? 0, hint: "kunlik faol", color: "var(--brand-strong)" },
  { label: "WAU", value: s.value?.activeThisWeek ?? 0, hint: "haftalik faol", color: "var(--info)" },
  { label: "MAU", value: s.value?.activeThisMonth ?? 0, hint: "oylik faol", color: "var(--purple)" },
  { label: "Premium", value: s.value?.premiumUsers ?? 0, hint: "faol obuna", color: "var(--success)" },
  { label: "Bepul", value: s.value?.freeUsers ?? 0, hint: "obunasiz", color: "var(--text-muted)" },
]);

// ── Ro'yxatdan o'tish trendi (oxirgi 30 kun) ──────────────────────
const trend = computed(() => s.value?.dailyRegistrations ?? []);
const trendLabels = computed(() =>
  trend.value.map((d) => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  }),
);

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const gridColor = ref("#eaecf1");
const tickColor = ref("#94a3b8");
const refreshThemeColors = () => {
  gridColor.value = cssVar("--border") || "#eaecf1";
  tickColor.value = cssVar("--text-faint") || "#94a3b8";
};
onMounted(refreshThemeColors);
watch(() => themeStore.mode, () => setTimeout(refreshThemeColors, 50));

const chartData = computed(() => ({
  labels: trendLabels.value,
  datasets: [
    {
      label: "Yangi foydalanuvchilar",
      data: trend.value.map((d) => d.count),
      backgroundColor: "#7cc243",
      borderRadius: 5,
      maxBarThickness: 18,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: tickColor.value, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
    },
    y: {
      grid: { color: gridColor.value, drawTicks: false },
      border: { display: false },
      ticks: { color: tickColor.value, font: { size: 11 }, precision: 0 },
      beginAtZero: true,
    },
  },
}));

const hasTrend = computed(() => trend.value.some((d) => d.count > 0));
</script>

<template>
  <div class="space-y-5">
    <!-- Yangi foydalanuvchi kartochkalari -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="c in cards" :key="c.label" class="app-card p-5">
        <div class="flex items-start justify-between gap-2">
          <p class="text-[13px] font-medium" style="color: var(--text-muted)">{{ c.label }}</p>
          <span
            v-if="c.grows !== null"
            class="flex items-center gap-1 text-[11.5px] font-semibold px-1.5 py-0.5 rounded-full"
            :style="{
              background: c.grows >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
              color: c.grows >= 0 ? 'var(--success)' : 'var(--danger)',
            }"
          >
            {{ c.grows >= 0 ? "+" : "" }}{{ c.grows }}%
          </span>
        </div>
        <p class="text-[28px] font-bold mt-2 leading-none tracking-tight" :style="{ color: c.color }">
          {{ c.value.toLocaleString() }}
        </p>
        <p class="text-[12px] mt-2" style="color: var(--text-faint)">{{ c.hint }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <!-- Ro'yxatdan o'tish trendi -->
      <div class="xl:col-span-2 min-w-0">
        <Card title="Ro'yxatdan o'tish dinamikasi" subtitle="Oxirgi 30 kunlik yangi foydalanuvchilar">
          <template #actions>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-md" style="background: var(--success-soft); color: var(--success)">
              real ma'lumot
            </span>
          </template>
          <div class="h-[240px] relative">
            <Bar :data="chartData" :options="chartOptions" />
            <div v-if="!hasTrend" class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span class="text-[13px]" style="color: var(--text-faint)">So'nggi 30 kunda yangi ro'yxatdan o'tish yo'q</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Faollik + obuna mini-ko'rsatkichlari -->
      <div class="min-w-0">
        <Card title="Faollik va obuna" subtitle="Ilova foydalanuvchilari holati">
          <div class="space-y-2.5 mt-1">
            <div
              v-for="m in miniStats"
              :key="m.label"
              class="flex items-center justify-between p-3 rounded-xl"
              style="background: var(--surface-2); border: 1px solid var(--border)"
            >
              <div>
                <p class="text-[13px] font-semibold" style="color: var(--text)">{{ m.label }}</p>
                <p class="text-[11px]" style="color: var(--text-faint)">{{ m.hint }}</p>
              </div>
              <p class="text-[20px] font-bold leading-none" :style="{ color: m.color }">
                {{ m.value.toLocaleString() }}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
