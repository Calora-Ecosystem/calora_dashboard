<script setup>
import { computed, onMounted, ref, watch } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
} from "chart.js";
import { Line } from "vue-chartjs";
import Card from "./Card.vue";
import { useThemeStore } from "../../stores/themeStore";
import { useDashboardStore } from "../../stores/dashboardStore";

ChartJS.register(
  Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler,
);

const themeStore = useThemeStore();
const dashboardStore = useDashboardStore();

const monthlyLabels = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

// Backend oy raqami (1-12) → summa dict qaytaradi. Har bir yorliqqa
// mos oyni indeks bo'yicha joylashtiramiz (bo'sh oylar 0).
const seriesData = computed(() => {
  const real = dashboardStore.salesMonthlySummary ?? {};
  return monthlyLabels.map((_, i) => Number(real[String(i + 1)] ?? 0));
});

const hasData = computed(() => seriesData.value.some((v) => v > 0));

const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const chartData = computed(() => ({
  labels: monthlyLabels,
  datasets: [
    {
      label: "Savdolar",
      data: seriesData.value,
      borderColor: "#7cc243",
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: "#7cc243",
      pointHoverBorderColor: "#fff",
      pointHoverBorderWidth: 2,
      backgroundColor: (ctx) => {
        const { chart } = ctx;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return "rgba(124,194,67,0.15)";
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, "rgba(124,194,67,0.35)");
        g.addColorStop(1, "rgba(124,194,67,0.01)");
        return g;
      },
    },
  ],
}));

const gridColor = ref("#eaecf1");
const tickColor = ref("#94a3b8");

const refreshThemeColors = () => {
  gridColor.value = cssVar("--border") || "#eaecf1";
  tickColor.value = cssVar("--text-faint") || "#94a3b8";
};

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: themeStore.mode === "dark" ? "#1a212e" : "#1a202c",
      padding: 12,
      cornerRadius: 10,
      titleColor: "#fff",
      bodyColor: "#cbd5e1",
      borderColor: "rgba(124,194,67,0.4)",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: tickColor.value, font: { size: 12 } },
    },
    y: {
      grid: { color: gridColor.value, drawTicks: false },
      border: { display: false },
      ticks: { color: tickColor.value, font: { size: 12 }, padding: 8 },
    },
  },
}));

onMounted(async () => {
  refreshThemeColors();
  await dashboardStore.loadSalesMonthlySummary();
});

watch(() => themeStore.mode, () => setTimeout(refreshThemeColors, 50));
</script>

<template>
  <Card>
    <template #title>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 class="font-bold text-[17px]" style="color: var(--text)">Savdolar dinamikasi</h2>
          <p class="text-[12.5px] mt-0.5" style="color: var(--text-faint)">{{ new Date().getFullYear() }}-yil oylik tushum (so'm)</p>
        </div>
        <span class="text-[11px] font-medium px-2 py-0.5 rounded-md self-start" style="background: var(--success-soft); color: var(--success)">
          real ma'lumot
        </span>
      </div>
    </template>
    <div class="h-[300px] sm:h-[340px] relative">
      <Line :data="chartData" :options="chartOptions" />
      <div v-if="!hasData" class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span class="text-[13px]" style="color: var(--text-faint)">Bu yil uchun savdo ma'lumoti yo'q</span>
      </div>
    </div>
  </Card>
</template>
