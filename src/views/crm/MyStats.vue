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
import Icon from "./components/Icon.vue";
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

const hasSales = computed(() => (stats.value?.sales ?? 0) > 0);

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
  plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 12, padding: 16 } } },
  cutout: "64%",
};
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title"><Icon name="trending-up" :size="22" /> Mening statistikam</h1>
        <p class="page-sub">Shaxsiy sotuv ko'rsatkichlaringiz</p>
      </div>
      <div class="seg">
        <button v-for="p in STATS_PERIODS" :key="p" class="seg-btn" :class="{ 'seg-active': period === p }" @click="setPeriod(p)">{{ PERIOD_LABEL[p] }}</button>
      </div>
    </header>

    <section class="kpi-grid">
      <KpiCard label="Ishlangan leadlar" :value="stats?.leadsWorked ?? 0" icon="users" accent="var(--info)" />
      <KpiCard label="Qo'ng'iroqlar" :value="stats?.calls ?? 0" icon="phone" accent="var(--warning)" />
      <KpiCard label="Sotuvlar" :value="stats?.sales ?? 0" icon="check-circle" accent="var(--success)" />
      <KpiCard label="Tushum" :value="formatMoney(stats?.revenue ?? 0)" icon="wallet" accent="var(--success)" />
      <KpiCard label="Conversion" :value="`${stats?.conversionRate ?? 0}%`" icon="trending-up" accent="var(--brand-strong)" />
    </section>

    <section class="two-col">
      <div class="app-card panel">
        <h2 class="sec-title"><Icon name="credit-card" :size="16" /> To'lov turlari</h2>
        <div v-if="hasSales" class="chart-wrap">
          <Doughnut :data="paymentData" :options="paymentOptions" />
        </div>
        <div v-else class="muted center">Bu davrda sotuv yo'q</div>
      </div>

      <div class="app-card panel">
        <h2 class="sec-title"><Icon name="layout-dashboard" :size="16" /> Xulosa</h2>
        <ul class="summary">
          <li><span><Icon name="credit-card" :size="14" /> Karta orqali sotuvlar</span><b>{{ stats?.cardSales ?? 0 }}</b></li>
          <li><span><Icon name="smartphone" :size="14" /> Platforma orqali sotuvlar</span><b>{{ stats?.platformSales ?? 0 }}</b></li>
          <li><span><Icon name="trending-up" :size="14" /> O'rtacha conversion</span><b>{{ stats?.conversionRate ?? 0 }}%</b></li>
          <li><span><Icon name="wallet" :size="14" /> Jami tushum</span><b>{{ formatMoney(stats?.revenue ?? 0) }}</b></li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.page-title :deep(.crm-icon) { color: var(--brand-strong); }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.seg { display: inline-flex; padding: 4px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--border); gap: 3px; }
.seg-btn { padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--text-muted); transition: all 0.15s ease; }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 12px; }
.two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.panel { padding: 20px; }
.sec-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 16px; }
.sec-title :deep(.crm-icon) { color: var(--brand-strong); }
.chart-wrap { height: 240px; }
.center { text-align: center; padding: 60px 0; }
.muted { color: var(--text-faint); font-size: 13px; }
.summary { display: flex; flex-direction: column; gap: 9px; }
.summary li { display: flex; justify-content: space-between; align-items: center; background: var(--surface-2); border-radius: 11px; padding: 11px 14px; font-size: 13.5px; }
.summary span { display: inline-flex; align-items: center; gap: 8px; color: var(--text-muted); }
.summary b { color: var(--text); }
@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .page-title { font-size: 19px; }
}
</style>
