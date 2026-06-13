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
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "vue-chartjs";
import KpiCard from "../components/KpiCard.vue";
import Icon from "../components/Icon.vue";
import {
  useSalesStore,
  type SalesOverviewDto,
  type FunnelStageDto,
  type RevenuePointDto,
  type PremiumBreakdownDto,
  type PromoRedemptionDto,
} from "../../../stores/salesStore";
import type { StatsPeriod } from "../../../stores/crmStore";
import { STATS_PERIODS } from "../../../constants/ApiContstants";
import { STATUS_META, PERIOD_LABEL, relativeTime } from "../crmMeta";
import { formatMoney } from "../../../utils/FormatHelper";

ChartJS.register(Title, Tooltip, Legend, LineElement, BarElement, PointElement, ArcElement, CategoryScale, LinearScale, Filler);

const salesStore = useSalesStore();
const overview = ref<SalesOverviewDto | null>(null);
const funnel = ref<FunnelStageDto[]>([]);
const revenue = ref<RevenuePointDto[]>([]);
const revPeriod = ref<StatsPeriod>("Day");
const premium = ref<PremiumBreakdownDto | null>(null);
const promos = ref<PromoRedemptionDto[]>([]);

const loadRevenue = async () => {
  const r = await salesStore.getRevenue(revPeriod.value);
  revenue.value = r.content ?? [];
};

onMounted(async () => {
  const [o, f, p, pr] = await Promise.all([
    salesStore.getOverview(),
    salesStore.getFunnel(),
    salesStore.getPremiumBreakdown(),
    salesStore.getPromoRedemptions(),
  ]);
  overview.value = o.content;
  funnel.value = f.content ?? [];
  premium.value = p.content;
  promos.value = pr.content ?? [];
  await loadRevenue();
});

const premiumChart = computed(() => ({
  labels: ["Platforma purchase", "Promo-code"],
  datasets: [
    {
      data: [premium.value?.viaPurchase ?? 0, premium.value?.viaPromoCode ?? 0],
      backgroundColor: ["#7cc243", "#9333ea"],
      borderWidth: 0,
    },
  ],
}));

const premiumChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 12, padding: 14 } } },
  cutout: "62%",
};

const premiumPct = (n: number) => {
  const t = premium.value?.total ?? 0;
  return t === 0 ? 0 : Math.round((n / t) * 100);
};

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

    <!-- Premium acquisition -->
    <section class="two-col premium-row">
      <div class="app-card panel">
        <h2 class="sec-title"><Icon name="wallet" :size="16" /> Premium qanday olindi</h2>
        <div class="premium-grid">
          <div class="donut">
            <Doughnut :data="premiumChart" :options="premiumChartOptions" />
            <div class="donut-center">
              <b>{{ premium?.total ?? 0 }}</b><span>premium</span>
            </div>
          </div>
          <ul class="pm-list">
            <li>
              <span class="pm-dot" style="background: #7cc243" />
              <div class="pm-info"><span>Platforma purchase</span><small>Karta + IAP to'lov</small></div>
              <b>{{ premium?.viaPurchase ?? 0 }} <i>· {{ premiumPct(premium?.viaPurchase ?? 0) }}%</i></b>
            </li>
            <li class="sub">
              <span class="pm-dot sm" style="background: #2e90fa" />
              <div class="pm-info"><span>Karta (Click/Payme)</span></div>
              <b>{{ premium?.card ?? 0 }}</b>
            </li>
            <li class="sub">
              <span class="pm-dot sm" style="background: #f79009" />
              <div class="pm-info"><span>Platforma (IAP)</span></div>
              <b>{{ premium?.platform ?? 0 }}</b>
            </li>
            <li>
              <span class="pm-dot" style="background: #9333ea" />
              <div class="pm-info"><span>Promo-code</span><small>Kupon orqali</small></div>
              <b>{{ premium?.viaPromoCode ?? 0 }} <i>· {{ premiumPct(premium?.viaPromoCode ?? 0) }}%</i></b>
            </li>
          </ul>
        </div>
        <div class="rev-split">
          <div><span>Purchase tushum</span><b>{{ formatMoney(premium?.purchaseRevenue ?? 0) }}</b></div>
          <div><span>Promo tushum</span><b>{{ formatMoney(premium?.promoRevenue ?? 0) }}</b></div>
        </div>
      </div>

      <div class="app-card panel">
        <h2 class="sec-title"><Icon name="sparkles" :size="16" /> So'nggi promo-code premiumlar</h2>
        <div v-if="!promos.length" class="empty"><Icon name="sparkles" :size="26" /><span>Promo-code orqali premium yo'q</span></div>
        <ul v-else class="promo-list">
          <li v-for="r in promos" :key="r.leadId">
            <div class="min-w-0">
              <div class="pr-name">{{ r.userName ?? "Noma'lum" }}</div>
              <div class="pr-sub">{{ r.userPhone ?? "—" }}<template v-if="r.operatorName"> · {{ r.operatorName }}</template></div>
            </div>
            <span class="promo-code">{{ r.promoCode ?? "—" }}</span>
            <div class="pr-right">
              <b>{{ formatMoney(r.amount ?? 0) }}</b>
              <small>{{ relativeTime(r.wonAt) }}</small>
            </div>
          </li>
        </ul>
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
.premium-row { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
.premium-grid { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
.donut { position: relative; width: 160px; height: 160px; flex-shrink: 0; }
.donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.donut-center b { font-size: 24px; font-weight: 800; color: var(--text); line-height: 1; }
.donut-center span { font-size: 11px; color: var(--text-faint); }
.pm-list { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 7px; }
.pm-list li { display: flex; align-items: center; gap: 9px; font-size: 13px; }
.pm-list li.sub { padding-left: 16px; font-size: 12px; color: var(--text-muted); }
.pm-dot { width: 11px; height: 11px; border-radius: 3px; flex-shrink: 0; }
.pm-dot.sm { width: 8px; height: 8px; border-radius: 2px; }
.pm-info { flex: 1; display: flex; flex-direction: column; }
.pm-info span { color: var(--text); font-weight: 600; }
.pm-list li.sub .pm-info span { color: var(--text-muted); font-weight: 500; }
.pm-info small { font-size: 10.5px; color: var(--text-faint); }
.pm-list b { color: var(--text); font-weight: 700; }
.pm-list b i { font-style: normal; color: var(--text-faint); font-weight: 600; font-size: 11.5px; }
.rev-split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
.rev-split > div { background: var(--surface-2); border-radius: 11px; padding: 11px 13px; display: flex; flex-direction: column; gap: 3px; }
.rev-split span { font-size: 11.5px; color: var(--text-faint); }
.rev-split b { font-size: 15px; color: var(--text); }
.promo-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.promo-list li { display: flex; align-items: center; gap: 11px; padding: 10px 12px; background: var(--surface-2); border-radius: 11px; }
.pr-name { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pr-sub { font-size: 11.5px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.promo-code { font-size: 12px; font-weight: 700; color: #9333ea; background: rgba(147,51,234,0.12); padding: 4px 10px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
.pr-right { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.pr-right b { font-size: 13px; color: var(--text); }
.pr-right small { font-size: 10.5px; color: var(--text-faint); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 30px; text-align: center; color: var(--text-faint); font-size: 13px; }
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
