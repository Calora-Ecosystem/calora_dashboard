<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from "chart.js";
import { Line } from "vue-chartjs";
import KpiCard from "../components/KpiCard.vue";
import Icon from "../components/Icon.vue";
import {
  useSalesStore,
  type SalesOverviewDto,
  type FunnelStageDto,
  type RevenuePointDto,
} from "../../../stores/salesStore";
import type { StatsPeriod } from "../../../stores/crmStore";
import { STATS_PERIODS } from "../../../constants/ApiContstants";
import { STATUS_META, PERIOD_LABEL } from "../crmMeta";
import { formatMoney } from "../../../utils/FormatHelper";

ChartJS.register(Title, Tooltip, Legend, LineElement, BarElement, PointElement, CategoryScale, LinearScale, Filler);

const salesStore = useSalesStore();
const overview = ref<SalesOverviewDto | null>(null);
const funnel = ref<FunnelStageDto[]>([]);
const revenue = ref<RevenuePointDto[]>([]);
const revPeriod = ref<StatsPeriod>("Day");

const loadRevenue = async () => {
  const r = await salesStore.getRevenue(revPeriod.value);
  revenue.value = r.content ?? [];
};

onMounted(async () => {
  const [o, f] = await Promise.all([salesStore.getOverview(), salesStore.getFunnel()]);
  overview.value = o.content;
  funnel.value = f.content ?? [];
  await loadRevenue();
});

const setRevPeriod = (p: StatsPeriod) => {
  revPeriod.value = p;
  loadRevenue();
};

const maxFunnel = computed(() => Math.max(1, ...funnel.value.filter((s) => s.status !== "Lost").map((s) => s.count)));

const revChart = computed(() => ({
  labels: revenue.value.map((p) => p.label),
  datasets: [
    {
      label: "Tushum",
      data: revenue.value.map((p) => p.revenue),
      borderColor: "#7cc243",
      backgroundColor: "rgba(124,194,67,0.18)",
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: "#7cc243",
      pointHoverBorderColor: "#fff",
      pointHoverBorderWidth: 2,
    },
  ],
}));

const revOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => formatMoney(Number(c.raw)) } } },
  scales: {
    y: { ticks: { callback: (v: any) => formatMoney(Number(v)), font: { size: 11 } }, grid: { color: "rgba(148,163,184,0.15)" } },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
};
</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title"><Icon name="layout-dashboard" :size="22" /> Sotuv analitikasi</h1>
      <p class="page-sub">Jamoa bo'yicha umumiy ko'rsatkichlar</p>
    </header>

    <section class="kpi-grid">
      <KpiCard label="Jami leadlar" :value="overview?.totalLeads ?? 0" icon="users" accent="var(--info)" />
      <KpiCard label="Bugun qo'shilgan" :value="overview?.todayLeads ?? 0" icon="sparkles" accent="var(--brand-strong)" />
      <KpiCard label="Faol leadlar" :value="overview?.activeLeads ?? 0" icon="zap" accent="var(--warning)" />
      <KpiCard label="Hot leadlar" :value="overview?.hotLeads ?? 0" icon="flame" accent="var(--danger)" />
      <KpiCard label="Bugungi qo'ng'iroqlar" :value="overview?.todayCalls ?? 0" icon="phone" accent="var(--info)" />
      <KpiCard label="Bugungi sotuvlar" :value="overview?.todaySales ?? 0" icon="check-circle" accent="var(--success)" />
      <KpiCard label="Bugungi tushum" :value="formatMoney(overview?.todayRevenue ?? 0)" icon="wallet" accent="var(--success)" />
      <KpiCard label="Conversion" :value="`${overview?.conversionRate ?? 0}%`" icon="trending-up" accent="var(--brand-strong)" />
      <KpiCard label="Operatorlar" :value="overview?.operatorsCount ?? 0" icon="briefcase" accent="#9333ea" />
    </section>

    <section class="two-col">
      <div class="app-card panel">
        <h2 class="sec-title"><Icon name="filter" :size="16" /> Sotuv Funnel</h2>
        <ul class="funnel">
          <li v-for="s in funnel" :key="s.status" v-show="s.status !== 'Lost'">
            <div class="funnel-top">
              <span class="funnel-name">
                <span class="dot" :style="{ background: STATUS_META[s.status].color }" />
                {{ STATUS_META[s.status].label }}
              </span>
              <span class="funnel-val">
                {{ s.count }}<template v-if="s.status !== 'New'"> · {{ s.conversionFromPrevious }}%</template>
              </span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: (s.count / maxFunnel * 100) + '%', background: STATUS_META[s.status].color }" />
            </div>
          </li>
        </ul>
        <div class="lost-line">
          <span><Icon name="x" :size="13" /> {{ STATUS_META.Lost.label }}</span>
          <b>{{ funnel.find((s) => s.status === 'Lost')?.count ?? 0 }}</b>
        </div>
      </div>

      <div class="app-card panel">
        <div class="panel-head">
          <h2 class="sec-title" style="margin: 0"><Icon name="trending-up" :size="16" /> Tushum dinamikasi</h2>
          <div class="seg">
            <button v-for="p in STATS_PERIODS" :key="p" class="seg-btn" :class="{ 'seg-active': revPeriod === p }" @click="setRevPeriod(p)">{{ PERIOD_LABEL[p] }}</button>
          </div>
        </div>
        <div class="chart-wrap">
          <Line :data="revChart" :options="revOptions" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.page-title :deep(.crm-icon) { color: var(--brand-strong); }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 12px; }
.two-col { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 16px; align-items: start; }
.panel { padding: 20px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.sec-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 16px; }
.sec-title :deep(.crm-icon) { color: var(--brand-strong); }
.funnel { display: flex; flex-direction: column; gap: 13px; }
.funnel-top { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; margin-bottom: 6px; }
.funnel-name { display: inline-flex; align-items: center; gap: 7px; color: var(--text); font-weight: 600; }
.funnel-name .dot { width: 8px; height: 8px; border-radius: 50%; }
.funnel-val { color: var(--text-muted); font-weight: 600; }
.bar-track { height: 12px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }
.lost-line {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); font-size: 13px;
}
.lost-line span { display: inline-flex; align-items: center; gap: 6px; color: var(--danger); }
.lost-line b { color: var(--danger); }
.seg { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); gap: 2px; }
.seg-btn { padding: 6px 13px; border-radius: 7px; font-size: 12px; font-weight: 600; color: var(--text-muted); transition: all 0.15s ease; }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.chart-wrap { height: 280px; }
@media (max-width: 860px) {
  .two-col { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .page-title { font-size: 19px; }
}
</style>
