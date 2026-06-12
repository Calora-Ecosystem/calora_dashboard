<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Doughnut } from "vue-chartjs";
import KpiCard from "./components/KpiCard.vue";
import {
  useCrmStore,
  type OperatorStatsDto,
  type StatsPeriod,
} from "../../stores/crmStore";
import { STATS_PERIODS } from "../../constants/ApiContstants";
import { PERIOD_LABEL } from "./crmMeta";
import { formatMoney } from "../../utils/FormatHelper";

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale);

const crmStore = useCrmStore();
const period = ref<StatsPeriod>("Month");
const stats = ref<OperatorStatsDto | null>(null);

const load = async () => {
  const res = await crmStore.getMyStats(period.value);
  stats.value = res.content;
};

onMounted(load);

const setPeriod = (p: StatsPeriod) => {
  period.value = p;
  load();
};

const paymentData = computed(() => ({
  labels: ["Karta (Click/Payme)", "Platforma (IAP)"],
  datasets: [
    {
      data: [stats.value?.cardSales ?? 0, stats.value?.platformSales ?? 0],
      backgroundColor: ["#2e90fa", "#f79009"],
      borderWidth: 0,
    },
  ],
}));

const paymentOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" as const } },
  cutout: "62%",
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold" style="color: var(--text)">Mening statistikam</h1>
        <p class="text-[13px]" style="color: var(--text-faint)">Shaxsiy sotuv ko'rsatkichlaringiz</p>
      </div>
      <div class="seg">
        <button
          v-for="p in STATS_PERIODS"
          :key="p"
          class="seg-btn"
          :class="{ 'seg-active': period === p }"
          @click="setPeriod(p)"
        >{{ PERIOD_LABEL[p] }}</button>
      </div>
    </div>

    <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
      <KpiCard label="Ishlangan leadlar" :value="stats?.leadsWorked ?? 0" icon="👥" accent="var(--info)" />
      <KpiCard label="Qo'ng'iroqlar" :value="stats?.calls ?? 0" icon="📞" accent="var(--warning)" />
      <KpiCard label="Sotuvlar" :value="stats?.sales ?? 0" icon="✅" accent="var(--success)" />
      <KpiCard label="Tushum" :value="formatMoney(stats?.revenue ?? 0)" icon="💰" accent="var(--success)" />
      <KpiCard label="Conversion" :value="`${stats?.conversionRate ?? 0}%`" icon="📈" accent="var(--brand-strong)" />
    </div>

    <div class="grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))">
      <section class="app-card p-5">
        <h2 class="sec-title">To'lov turlari</h2>
        <div style="height: 240px">
          <Doughnut :data="paymentData" :options="paymentOptions" />
        </div>
      </section>

      <section class="app-card p-5">
        <h2 class="sec-title">Xulosa</h2>
        <ul class="flex flex-col gap-2.5">
          <li class="srow"><span>Karta orqali sotuvlar</span><b>{{ stats?.cardSales ?? 0 }}</b></li>
          <li class="srow"><span>Platforma orqali sotuvlar</span><b>{{ stats?.platformSales ?? 0 }}</b></li>
          <li class="srow"><span>O'rtacha conversion</span><b>{{ stats?.conversionRate ?? 0 }}%</b></li>
          <li class="srow"><span>Jami tushum</span><b>{{ formatMoney(stats?.revenue ?? 0) }}</b></li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  gap: 2px;
}
.seg-btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}
.seg-active {
  background: var(--surface);
  color: var(--brand-strong);
  box-shadow: var(--shadow-sm);
}
.sec-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 14px;
}
.srow {
  display: flex;
  justify-content: space-between;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 13.5px;
}
.srow span { color: var(--text-muted); }
.srow b { color: var(--text); }
</style>
