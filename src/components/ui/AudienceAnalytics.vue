<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar, Doughnut } from "vue-chartjs";
import Card from "./Card.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useThemeStore } from "../../stores/themeStore";

ChartJS.register(Title, Tooltip, Legend, BarElement, ArcElement, CategoryScale, LinearScale);

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();
const loading = ref(true);

onMounted(async () => {
  try {
    await dashboardStore.loadAudienceAnalytics();
  } finally {
    loading.value = false;
  }
});

const a = computed(() => dashboardStore.audienceAnalytics);

// ── Yorliq xaritalari ─────────────────────────────────────────────
const GENDER_LABELS: Record<string, string> = { Male: "Erkak", Female: "Ayol" };
const PURPOSE_LABELS: Record<number, string> = {
  1: "Vazn kamaytirish",
  2: "Saqlab qolish",
  3: "Mushak yig'ish",
};
const ACTIVITY_LABELS: Record<number, string> = {
  1: "Minimal",
  2: "Kam",
  3: "O'rta",
  4: "Yuqori",
  5: "Maksimal",
};
const LANGUAGE_LABELS: Record<number, string> = {
  1: "O'zbek",
  2: "Kirill",
  3: "Rus",
  4: "Ingliz",
};
const WEEKDAY_LABELS = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

// ── Tema ranglari ─────────────────────────────────────────────────
const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const gridColor = ref("#eaecf1");
const tickColor = ref("#94a3b8");
const textColor = ref("#334155");
const refreshThemeColors = () => {
  gridColor.value = cssVar("--border") || "#eaecf1";
  tickColor.value = cssVar("--text-faint") || "#94a3b8";
  textColor.value = cssVar("--text-muted") || "#334155";
};
onMounted(refreshThemeColors);
watch(() => themeStore.mode, () => setTimeout(refreshThemeColors, 50));

// ── Soatlik ro'yxatdan o'tish ─────────────────────────────────────
const peakHour = computed(() => a.value?.peakHour ?? null);
const hourLabels = computed(() =>
  (a.value?.hourlyRegistrations ?? []).map((h) => `${String(h.hour).padStart(2, "0")}`),
);
const hourlyData = computed(() => ({
  labels: hourLabels.value,
  datasets: [
    {
      label: "Ro'yxatdan o'tishlar",
      data: (a.value?.hourlyRegistrations ?? []).map((h) => h.count),
      backgroundColor: (a.value?.hourlyRegistrations ?? []).map((h) =>
        h.hour === peakHour.value ? "#f59e0b" : "#7cc243",
      ),
      borderRadius: 4,
      maxBarThickness: 22,
    },
  ],
}));

const barOptions = (unit = "") =>
  computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.y ?? ctx.parsed.x} ${unit}`.trimEnd(),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: tickColor.value, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: gridColor.value, drawTicks: false },
        border: { display: false },
        ticks: { color: tickColor.value, font: { size: 11 }, precision: 0 },
        beginAtZero: true,
      },
    },
  }));

const hourlyOptions = barOptions();

// ── Hafta kunlari ─────────────────────────────────────────────────
const weekdayData = computed(() => ({
  labels: (a.value?.weekdayRegistrations ?? []).map((w) => WEEKDAY_LABELS[w.weekday] ?? w.weekday),
  datasets: [
    {
      label: "Ro'yxatdan o'tishlar",
      data: (a.value?.weekdayRegistrations ?? []).map((w) => w.count),
      backgroundColor: "#6366f1",
      borderRadius: 4,
      maxBarThickness: 34,
    },
  ],
}));
const weekdayOptions = barOptions();

// ── Yosh guruhlari ────────────────────────────────────────────────
const ageData = computed(() => ({
  labels: (a.value?.ageGroups ?? []).map((g) => g.group),
  datasets: [
    {
      label: "Foydalanuvchilar",
      data: (a.value?.ageGroups ?? []).map((g) => g.count),
      backgroundColor: "#0ea5e9",
      borderRadius: 4,
      maxBarThickness: 40,
    },
  ],
}));
const ageOptions = barOptions();

// ── Jins (doughnut) ───────────────────────────────────────────────
const genderTotal = computed(() =>
  (a.value?.genderBreakdown ?? []).reduce((s, g) => s + g.count, 0),
);
const genderData = computed(() => ({
  labels: (a.value?.genderBreakdown ?? []).map((g) => GENDER_LABELS[g.gender] ?? "Boshqa"),
  datasets: [
    {
      data: (a.value?.genderBreakdown ?? []).map((g) => g.count),
      backgroundColor: ["#3b82f6", "#ec4899"],
      borderWidth: 0,
      hoverOffset: 6,
    },
  ],
}));
const genderOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: "62%",
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: { color: textColor.value, font: { size: 12 }, padding: 14, usePointStyle: true },
    },
    tooltip: {
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => {
          const pct = genderTotal.value ? Math.round((ctx.parsed / genderTotal.value) * 100) : 0;
          return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
        },
      },
    },
  },
}));

// ── Taqsimot ro'yxatlari (maqsad / faollik / til) ────────────────
const distList = (
  rows: { value: number; count: number }[] | undefined,
  labels: Record<number, string>,
) => {
  const total = (rows ?? []).reduce((s, r) => s + r.count, 0) || 1;
  return (rows ?? [])
    .map((r) => ({
      label: labels[r.value] ?? "Boshqa",
      count: r.count,
      pct: Math.round((r.count / total) * 100),
    }))
    .sort((x, y) => y.count - x.count);
};

const purposeList = computed(() => distList(a.value?.purposeBreakdown, PURPOSE_LABELS));
const activityList = computed(() => distList(a.value?.activityLevelBreakdown, ACTIVITY_LABELS));
const languageList = computed(() => distList(a.value?.languageBreakdown, LANGUAGE_LABELS));

const hasData = computed(() => (a.value?.totalUsers ?? 0) > 0);
const peakHourLabel = computed(() =>
  peakHour.value === null ? "—" : `${String(peakHour.value).padStart(2, "0")}:00`,
);

const distGroups = computed(() => [
  { title: "Maqsad", rows: purposeList.value, color: "#7cc243" },
  { title: "Faollik darajasi", rows: activityList.value, color: "#f59e0b" },
  { title: "Til", rows: languageList.value, color: "#6366f1" },
]);
</script>

<template>
  <Card title="Auditoriya tahlili" subtitle="Foydalanuvchilar qachon ro'yxatdan o'tadi va kimlar ilova o'rnatadi">
    <template #actions>
      <div class="flex items-center gap-2">
        <span
          v-if="peakHour !== null"
          class="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
          style="background: var(--warning-soft); color: var(--warning)"
        >
          Eng faol soat: {{ peakHourLabel }}
        </span>
        <span
          class="text-[11px] font-medium px-2 py-1 rounded-md"
          style="background: var(--success-soft); color: var(--success)"
        >
          real ma'lumot
        </span>
      </div>
    </template>

    <div v-if="loading" class="py-16 text-center text-[13px]" style="color: var(--text-faint)">
      Yuklanmoqda...
    </div>

    <div v-else-if="!hasData" class="py-16 text-center text-[13px]" style="color: var(--text-faint)">
      Ma'lumot topilmadi
    </div>

    <div v-else class="space-y-5">
      <!-- Soatlik registratsiya -->
      <div>
        <p class="text-[13px] font-semibold mb-1" style="color: var(--text)">Soat bo'yicha ro'yxatdan o'tish</p>
        <p class="text-[12px] mb-3" style="color: var(--text-faint)">
          Kun davomida foydalanuvchilar qaysi soatlarda ko'proq ro'yxatdan o'tadi (00–23)
        </p>
        <div class="h-[210px]">
          <Bar :data="hourlyData" :options="hourlyOptions" />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Jins -->
        <div class="p-4 rounded-2xl" style="background: var(--surface-2); border: 1px solid var(--border)">
          <p class="text-[13px] font-semibold mb-3" style="color: var(--text)">Jins bo'yicha taqsimot</p>
          <div class="h-[220px]">
            <Doughnut :data="genderData" :options="genderOptions" />
          </div>
        </div>

        <!-- Yosh guruhlari -->
        <div class="p-4 rounded-2xl" style="background: var(--surface-2); border: 1px solid var(--border)">
          <p class="text-[13px] font-semibold mb-3" style="color: var(--text)">Yosh guruhlari</p>
          <div class="h-[220px]">
            <Bar :data="ageData" :options="ageOptions" />
          </div>
        </div>
      </div>

      <!-- Hafta kunlari -->
      <div class="p-4 rounded-2xl" style="background: var(--surface-2); border: 1px solid var(--border)">
        <p class="text-[13px] font-semibold mb-3" style="color: var(--text)">Hafta kunlari bo'yicha ro'yxatdan o'tish</p>
        <div class="h-[190px]">
          <Bar :data="weekdayData" :options="weekdayOptions" />
        </div>
      </div>

      <!-- Maqsad / Faollik / Til taqsimotlari -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="g in distGroups"
          :key="g.title"
          class="p-4 rounded-2xl"
          style="background: var(--surface-2); border: 1px solid var(--border)"
        >
          <p class="text-[13px] font-semibold mb-3" style="color: var(--text)">{{ g.title }}</p>
          <div v-if="g.rows.length" class="space-y-2.5">
            <div v-for="r in g.rows" :key="r.label">
              <div class="flex items-center justify-between text-[12.5px] mb-1">
                <span style="color: var(--text-muted)">{{ r.label }}</span>
                <span class="font-semibold" style="color: var(--text)">{{ r.count }} · {{ r.pct }}%</span>
              </div>
              <div class="h-1.5 rounded-full overflow-hidden" style="background: var(--surface-hover)">
                <div class="h-full rounded-full" :style="{ width: `${r.pct}%`, background: g.color }"></div>
              </div>
            </div>
          </div>
          <p v-else class="text-[12px]" style="color: var(--text-faint)">Ma'lumot yo'q</p>
        </div>
      </div>
    </div>
  </Card>
</template>
