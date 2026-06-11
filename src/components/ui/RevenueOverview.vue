<script setup lang="ts">
import { computed, onMounted } from "vue";
import Card from "./Card.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import { formatMoney } from "../../utils/FormatHelper";

const dashboardStore = useDashboardStore();

onMounted(async () => {
  await dashboardStore.loadOverallSummary();
  await dashboardStore.loadRevenueByPlan();
});

const s = computed(() => dashboardStore.overallSummary);

const arpu = computed(() => {
  const amount = s.value?.totalSalesAmount ?? 0;
  const users = s.value?.totalUsers ?? 0;
  return users ? amount / users : 0;
});

// Estimates until backend exposes recurring-revenue endpoints
const mrr = computed(() => s.value?.totalSalesAmount ?? 0);
const arr = computed(() => mrr.value * 12);
const ltv = computed(() => arpu.value * 12);

const tiles = computed(() => [
  { label: "MRR", hint: "Oylik takrorlanuvchi daromad", value: formatMoney(mrr.value), estimated: true, icon: "repeat" },
  { label: "ARR", hint: "Yillik takrorlanuvchi daromad", value: formatMoney(arr.value), estimated: true, icon: "calendar" },
  { label: "ARPU", hint: "Foydalanuvchi boshiga daromad", value: formatMoney(arpu.value), estimated: false, icon: "user" },
  { label: "LTV", hint: "Mijozning umrbod qiymati", value: formatMoney(ltv.value), estimated: true, icon: "heart" },
]);

const planColors = ["#7cc243", "#2e90fa", "#7a5af8", "#f79009", "#94a3b8"];
const plans = computed(() => dashboardStore.revenueByPlan);
const planTotal = computed(() =>
  plans.value.reduce((sum, p) => sum + p.amount, 0),
);
const pct = (v: number) => (planTotal.value ? (v / planTotal.value) * 100 : 0);
</script>

<template>
  <Card title="Daromad ko'rsatkichlari" subtitle="Moliyaviy salomatlik ko'rinishi">
    <!-- metric tiles -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div
        v-for="t in tiles"
        :key="t.label"
        class="p-4 rounded-2xl"
        style="background: var(--surface-2); border: 1px solid var(--border)"
      >
        <div class="flex items-center justify-between">
          <span class="text-[12.5px] font-semibold" style="color: var(--text-muted)">{{ t.label }}</span>
          <span
            v-if="t.estimated"
            class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style="background: var(--warning-soft); color: var(--warning)"
            title="Taxminiy — aniq qiymat uchun backend endpoint kerak"
          >~ taxminiy</span>
        </div>
        <p class="text-[20px] font-bold mt-2 leading-tight tracking-tight" style="color: var(--text)">
          {{ t.value }}
        </p>
        <p class="text-[11.5px] mt-1" style="color: var(--text-faint)">{{ t.hint }}</p>
      </div>
    </div>

    <!-- revenue by plan -->
    <div class="mt-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-[14px] font-semibold" style="color: var(--text)">Tariflar bo'yicha daromad</h3>
        <span class="text-[11px] font-medium px-2 py-0.5 rounded-md" style="background: var(--success-soft); color: var(--success)">
          real ma'lumot
        </span>
      </div>

      <div v-if="plans.length" class="space-y-4">
        <div v-for="(p, i) in plans" :key="p.plan">
          <div class="flex items-center justify-between text-[13px] mb-1.5">
            <span class="font-medium flex items-center gap-2" style="color: var(--text)">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ background: planColors[i % planColors.length] }"></span>
              {{ p.plan }}
              <span style="color: var(--text-faint)">· {{ p.count }} ta</span>
            </span>
            <span class="font-semibold" style="color: var(--text)">{{ formatMoney(p.amount) }}</span>
          </div>
          <div class="h-2 rounded-full overflow-hidden" style="background: var(--surface-hover)">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{ width: pct(p.amount) + '%', background: planColors[i % planColors.length] }"
            ></div>
          </div>
        </div>
      </div>
      <p v-else class="text-[13px] py-4 text-center" style="color: var(--text-faint)">
        Ma'lumot yuklanmoqda...
      </p>
    </div>
  </Card>
</template>
