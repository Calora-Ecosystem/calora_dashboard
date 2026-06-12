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
import {
  useSalesStore,
  type SalesOverviewDto,
  type FunnelStageDto,
  type RevenuePointDto,
} from "../../../stores/salesStore";
import type { StatsPeriod } from "../../../stores/crmStore";
import { STATS_PERIODS } from "../../../constants/ApiContstants";
import { STATUS_META } from "../crmMeta";
import { PERIOD_LABEL } from "../crmMeta";
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
    },
  ],
}));

const revOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { ticks: { callback: (v: any) => formatMoney(Number(v)) }, grid: { color: "rgba(148,163,184,0.15)" } },
    x: { grid: { display: false } },
  },
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <h1 class="text-[22px] font-extrabold" style="color: var(--text)">Sotuv analitikasi</h1>
      <p class="text-[13px]" style="color: var(--text-faint)">Jamoa bo'yicha umumiy ko'rsatkichlar</p>
    </div>

    <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(175px, 1fr))">
      <KpiCard label="Jami leadlar" :value="overview?.totalLeads ?? 0" icon="👥" accent="var(--info)" />
      <KpiCard label="Bugun qo'shilgan" :value="overview?.todayLeads ?? 0" icon="✨" accent="var(--brand-strong)" />
      <KpiCard label="Faol leadlar" :value="overview?.activeLeads ?? 0" icon="⚡" accent="var(--warning)" />
      <KpiCard label="Hot leadlar" :value="overview?.hotLeads ?? 0" icon="🔥" accent="var(--danger)" />
      <KpiCard label="Bugungi qo'ng'iroqlar" :value="overview?.todayCalls ?? 0" icon="📞" accent="var(--info)" />
      <KpiCard label="Bugungi sotuvlar" :value="overview?.todaySales ?? 0" icon="✅" accent="var(--success)" />
      <KpiCard label="Bugungi tushum" :value="formatMoney(overview?.todayRevenue ?? 0)" icon="💰" accent="var(--success)" />
      <KpiCard label="Conversion" :value="`${overview?.conversionRate ?? 0}%`" icon="📈" accent="var(--brand-strong)" />
      <KpiCard label="Operatorlar" :value="overview?.operatorsCount ?? 0" icon="🧑‍💼" accent="#9333ea" />
    </div>

    <div class="grid gap-5" style="grid-template-columns: minmax(300px, 1fr) minmax(320px, 1.3fr)">
      <section class="app-card p-5">
        <h2 class="sec-title">Sotuv Funnel</h2>
        <ul class="flex flex-col gap-2.5">
          <li v-for="s in funnel" :key="s.status" v-show="s.status !== 'Lost'">
            <div class="flex items-center justify-between text-[12.5px] mb-1">
              <span style="color: var(--text)">{{ STATUS_META[s.status].label }}</span>
              <span style="color: var(--text-muted)">{{ s.count }} <template v-if="s.status !== 'New'">· {{ s.conversionFromPrevious }}%</template></span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: (s.count / maxFunnel * 100) + '%', background: STATUS_META[s.status].color }" />
            </div>
          </li>
        </ul>
        <div class="lost-line">
          {{ STATUS_META.Lost.label }}: <b>{{ funnel.find((s) => s.status === 'Lost')?.count ?? 0 }}</b>
        </div>
      </section>

      <section class="app-card p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="sec-title" style="margin: 0">Tushum dinamikasi</h2>
          <div class="seg">
            <button v-for="p in STATS_PERIODS" :key="p" class="seg-btn" :class="{ 'seg-active': revPeriod === p }" @click="setRevPeriod(p)">{{ PERIOD_LABEL[p] }}</button>
          </div>
        </div>
        <div style="height: 280px">
          <Line :data="revChart" :options="revOptions" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sec-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 14px;
}
.bar-track {
  height: 12px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.lost-line {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--danger);
}
.seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  gap: 2px;
}
.seg-btn {
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.seg-active {
  background: var(--surface);
  color: var(--brand-strong);
  box-shadow: var(--shadow-sm);
}
</style>
