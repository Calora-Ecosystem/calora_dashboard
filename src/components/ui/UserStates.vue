<script setup lang="ts">
import { computed, onMounted } from "vue";
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

onMounted(async () => {
  await dashboardStore.loadUserStatistics();
});

const stats = computed(() => dashboardStore.userStatistics);
const total = computed(() => stats.value?.totalUsers ?? 0);

// Obuna kesimi: real backend ma'lumoti (premium/pro faol obunalar va bepul).
const planNames: Record<number, string> = { 1: "Bepul", 2: "Premium", 3: "Pro" };
const planColors: Record<number, string> = { 1: "#94a3b8", 2: "#7cc243", 3: "#7a5af8" };

const segments = computed(() => {
  const breakdown = stats.value?.planBreakdown ?? [];
  return breakdown
    .map((b) => ({
      label: planNames[b.plan] ?? "Boshqa",
      value: b.count,
      color: planColors[b.plan] ?? "#2e90fa",
    }))
    .filter((s) => s.value > 0);
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
  <Card title="Foydalanuvchilar holati" subtitle="Obuna bo'yicha taqsimot">
    <template #actions>
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-md" style="background: var(--success-soft); color: var(--success)">
        real ma'lumot
      </span>
    </template>
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
