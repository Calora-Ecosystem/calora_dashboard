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
import { ElButton, ElDatePicker, ElOption, ElRadioButton, ElRadioGroup, ElSelect } from "element-plus";
import Card from "./Card.vue";
import { useDashboardStore, type EventStatus } from "../../stores/dashboardStore";
import { useThemeStore } from "../../stores/themeStore";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();

const loading = ref(true);
const sourcesLoading = ref(true);

// ── Manba (source) va sana oralig'i tanlovi ───────────────────────
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const selectedSource = ref<string>("");
const filterMode = ref<"day" | "range">("range");
const singleDay = ref<string>(toDateStr(new Date()));
const defaultRangeStart = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return toDateStr(d);
})();
const dateRange = ref<[string, string]>([defaultRangeStart, toDateStr(new Date())]);

const sources = computed(() => dashboardStore.eventLogSources);

// Manba kodini o'qishga qulay ko'rinishga o'giradi, masalan
// "ai.food_recognition" → "Ai / Food recognition".
const prettySource = (source: string) =>
  source
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");

const loadSummary = async () => {
  if (!selectedSource.value) return;
  loading.value = true;
  try {
    const [from, to] =
      filterMode.value === "day"
        ? [singleDay.value, singleDay.value]
        : [dateRange.value[0], dateRange.value[1]];
    await dashboardStore.loadEventLogSummary(selectedSource.value, from, to);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const list = await dashboardStore.loadEventLogSources();
    selectedSource.value = list[0] ?? "";
  } finally {
    sourcesLoading.value = false;
  }
  if (selectedSource.value) await loadSummary();
  else loading.value = false;
});

watch(selectedSource, () => {
  if (selectedSource.value) loadSummary();
});

const s = computed(() => dashboardStore.eventLogSummary);
const hasData = computed(() => (s.value?.totalCount ?? 0) > 0);

// ── Statistika kartochkalari ───────────────────────────────────────
const formatMs = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
};

const cards = computed(() => [
  { label: "Jami hodisalar", value: s.value?.totalCount ?? 0, color: "var(--text)", bg: "var(--surface-hover)" },
  { label: "Muvaffaqiyatli", value: s.value?.successCount ?? 0, color: "var(--success)", bg: "var(--success-soft)" },
  { label: "Ogohlantirish", value: s.value?.warningCount ?? 0, color: "var(--warning)", bg: "var(--warning-soft)" },
  { label: "Xato", value: s.value?.errorCount ?? 0, color: "var(--danger)", bg: "var(--danger-soft)" },
]);

const errorRateColor = computed(() => {
  const r = s.value?.errorRatePercent ?? 0;
  if (r >= 20) return "var(--danger)";
  if (r >= 5) return "var(--warning)";
  return "var(--success)";
});

// ── Kunlik trend (Success/Warning/Error — stacked) ─────────────────
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

const trendLabels = computed(() =>
  (s.value?.dailyTrend ?? []).map((d) => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  }),
);

const trendData = computed(() => ({
  labels: trendLabels.value,
  datasets: [
    { label: "Muvaffaqiyatli", data: (s.value?.dailyTrend ?? []).map((d) => d.success), backgroundColor: "#22c55e", stack: "s" },
    { label: "Ogohlantirish", data: (s.value?.dailyTrend ?? []).map((d) => d.warning), backgroundColor: "#f59e0b", stack: "s" },
    { label: "Xato", data: (s.value?.dailyTrend ?? []).map((d) => d.error), backgroundColor: "#ef4444", stack: "s" },
  ],
}));

const trendOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: "bottom" as const, labels: { color: tickColor.value, boxWidth: 10, font: { size: 11 } } },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      border: { display: false },
      ticks: { color: tickColor.value, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
    },
    y: {
      stacked: true,
      grid: { color: gridColor.value, drawTicks: false },
      border: { display: false },
      ticks: { color: tickColor.value, font: { size: 11 }, precision: 0 },
      beginAtZero: true,
    },
  },
}));

// ── Natija kodlari bo'yicha taqsimot ───────────────────────────────
const statusColor = (status: EventStatus) => {
  if (status === "Success") return "var(--success)";
  if (status === "Warning") return "var(--warning)";
  return "var(--danger)";
};

const outcomeRows = computed(() => {
  const total = s.value?.totalCount || 1;
  return (s.value?.outcomeBreakdown ?? []).map((o) => ({
    ...o,
    pct: Math.round((o.count / total) * 100),
  }));
});

const topErrors = computed(() => s.value?.topErrors ?? []);
</script>

<template>
  <div class="space-y-5">
    <!-- Filtrlar -->
    <Card title="Hodisalar jurnali" subtitle="Har bir subsystem (AI, to'lov, notification va h.k.) hodisalari shu yerda kuzatiladi">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-[11.5px] font-medium" style="color: var(--text-faint)">Manba</span>
          <ElSelect
            v-model="selectedSource"
            :loading="sourcesLoading"
            placeholder="Manbani tanlang"
            size="large"
            style="width: 240px"
          >
            <ElOption v-for="src in sources" :key="src" :label="prettySource(src)" :value="src" />
          </ElSelect>
        </div>

        <ElRadioGroup v-model="filterMode" size="large" @change="loadSummary">
          <ElRadioButton label="day">Bitta kun</ElRadioButton>
          <ElRadioButton label="range">Oraliq (A → B)</ElRadioButton>
        </ElRadioGroup>

        <ElDatePicker
          v-if="filterMode === 'day'"
          v-model="singleDay"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="Kunni tanlang"
          size="large"
          style="width: 200px"
        />
        <ElDatePicker
          v-else
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="→"
          start-placeholder="Boshi"
          end-placeholder="Oxiri"
          size="large"
          unlink-panels
        />

        <ElButton type="primary" size="large" :loading="loading" @click="loadSummary">Ko'rsatish</ElButton>
      </div>
    </Card>

    <div v-if="loading" class="py-16 text-center text-[13px]" style="color: var(--text-faint)">
      Yuklanmoqda...
    </div>

    <div v-else-if="!selectedSource" class="py-16 text-center text-[13px]" style="color: var(--text-faint)">
      Hozircha jurnalda hech qanday manba yo'q
    </div>

    <template v-else>
      <!-- Statistika kartochkalari -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="c in cards" :key="c.label" class="app-card p-5">
          <p class="text-[13px] font-medium" style="color: var(--text-muted)">{{ c.label }}</p>
          <p class="text-[28px] font-bold mt-2 leading-none tracking-tight" :style="{ color: c.color }">
            {{ c.value.toLocaleString() }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="app-card p-5">
          <p class="text-[13px] font-medium" style="color: var(--text-muted)">Xato foizi</p>
          <p class="text-[28px] font-bold mt-2 leading-none tracking-tight" :style="{ color: errorRateColor }">
            {{ s?.errorRatePercent ?? 0 }}%
          </p>
        </div>
        <div class="app-card p-5">
          <p class="text-[13px] font-medium" style="color: var(--text-muted)">O'rtacha / eng uzun davomiylik</p>
          <p class="text-[28px] font-bold mt-2 leading-none tracking-tight" style="color: var(--info)">
            {{ formatMs(s?.avgDurationMs) }}
            <span class="text-[14px] font-medium" style="color: var(--text-faint)">/ {{ formatMs(s?.maxDurationMs) }}</span>
          </p>
        </div>
      </div>

      <div v-if="!hasData" class="py-16 text-center text-[13px]" style="color: var(--text-faint)">
        Tanlangan oraliqda hodisa topilmadi
      </div>

      <template v-else>
        <!-- Kunlik trend -->
        <Card title="Kunlik dinamika" subtitle="Muvaffaqiyatli / ogohlantirish / xato hodisalar soni">
          <div class="h-[260px]">
            <Bar :data="trendData" :options="trendOptions" />
          </div>
        </Card>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- Natija kodlari -->
          <Card title="Natija kodlari bo'yicha taqsimot" subtitle="Outcome — aniq natija kodi">
            <div v-if="outcomeRows.length" class="space-y-2.5">
              <div v-for="o in outcomeRows" :key="o.outcome">
                <div class="flex items-center justify-between text-[12.5px] mb-1">
                  <span class="flex items-center gap-2" style="color: var(--text-muted)">
                    <span class="w-2 h-2 rounded-full" :style="{ background: statusColor(o.status) }"></span>
                    {{ o.outcome }}
                  </span>
                  <span class="font-semibold" style="color: var(--text)">{{ o.count }} · {{ o.pct }}%</span>
                </div>
                <div class="h-1.5 rounded-full overflow-hidden" style="background: var(--surface-hover)">
                  <div class="h-full rounded-full" :style="{ width: `${o.pct}%`, background: statusColor(o.status) }"></div>
                </div>
              </div>
            </div>
            <p v-else class="text-[12px]" style="color: var(--text-faint)">Ma'lumot yo'q</p>
          </Card>

          <!-- Eng ko'p uchragan xatolar -->
          <Card title="Eng ko'p uchragan xatolar" subtitle="ErrorType bo'yicha, namunaviy xabar bilan">
            <div v-if="topErrors.length" class="space-y-2.5">
              <div
                v-for="e in topErrors"
                :key="e.errorType"
                class="p-3 rounded-xl"
                style="background: var(--surface-2); border: 1px solid var(--border)"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-semibold text-[13px]" style="color: var(--text)">{{ e.errorType }}</span>
                  <span
                    class="text-[11.5px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style="background: var(--danger-soft); color: var(--danger)"
                  >{{ e.count }}</span>
                </div>
                <p v-if="e.sampleMessage" class="text-[11.5px] mt-1 truncate" :title="e.sampleMessage" style="color: var(--text-faint)">
                  {{ e.sampleMessage }}
                </p>
              </div>
            </div>
            <p v-else class="text-[12px]" style="color: var(--text-faint)">Xato qayd etilmagan</p>
          </Card>
        </div>
      </template>
    </template>
  </div>
</template>
