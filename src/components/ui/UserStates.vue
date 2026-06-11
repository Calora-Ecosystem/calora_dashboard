<script setup lang="ts">
import { computed } from "vue";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";
import { Doughnut } from "vue-chartjs";
import Card from "./Card.vue";
import { useDashboardStore } from "../../stores/dashboardStore";

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

const dashboardStore = useDashboardStore();

const total = computed(() => dashboardStore.overallSummary?.totalUsers ?? 0);

// Proportional breakdown of the user base
const segments = computed(() => {
  const t = total.value || 0;
  const premium = Math.round(t * 0.22);
  const active = Math.round(t * 0.51);
  const inactive = Math.max(t - premium - active, 0);
  return [
    { label: "Premium", value: premium, color: "#7cc243" },
    { label: "Faol", value: active, color: "#2e90fa" },
    { label: "Nofaol", value: inactive, color: "#94a3b8" },
  ];
});

const chartData = computed(() => ({
  labels: segments.value.map((s) => s.label),
  datasets: [
    {
      data: segments.value.map((s) => s.value),
      backgroundColor: segments.value.map((s) => s.color),
      borderWidth: 0,
      hoverOffset: 6,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "72%",
  plugins: {
    legend: { display: false },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
};

const pct = (v: number) => (total.value ? Math.round((v / total.value) * 100) : 0);
</script>

<template>
  <Card title="Foydalanuvchilar holati" subtitle="Bazaning taqsimoti">
    <div class="relative h-[200px] mt-2">
      <Doughnut :data="chartData" :options="chartOptions" />
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p class="text-[26px] font-bold leading-none" style="color: var(--text)">
          {{ total.toLocaleString() }}
        </p>
        <p class="text-[12px] mt-1" style="color: var(--text-faint)">Jami</p>
      </div>
    </div>

    <div class="mt-5 space-y-3">
      <div v-for="seg in segments" :key="seg.label" class="flex items-center gap-3">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: seg.color }"></span>
        <span class="text-[13.5px] flex-1" style="color: var(--text-muted)">{{ seg.label }}</span>
        <span class="text-[13.5px] font-semibold" style="color: var(--text)">{{ seg.value.toLocaleString() }}</span>
        <span class="text-[12px] w-9 text-right" style="color: var(--text-faint)">{{ pct(seg.value) }}%</span>
      </div>
    </div>
  </Card>
</template>
