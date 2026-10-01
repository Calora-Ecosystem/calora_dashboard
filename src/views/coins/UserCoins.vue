<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Chart as ChartJS,
  Tooltip,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";
import { ElButton, ElOption, ElPagination, ElSelect, ElSkeleton, ElSwitch } from "element-plus";
import { useCoinStore } from "../../stores/coinStore";
import { useThemeStore } from "../../stores/themeStore";
import { makeFileUrl } from "../../integrations/axios";
import type { CoinTransactionDto, CoinTxType, UserCoinsDto } from "../../@types/coin";
import { useIsMobile } from "../../composables/useIsMobile";
import CopyText from "../../components/shared/CopyText.vue";
import UserDetailDrawer from "../../components/ui/UserDetailDrawer.vue";
import PeriodFilter from "./PeriodFilter.vue";
import {
  MEDAL_COLORS,
  TX_TYPES,
  TX_TYPE_LABEL,
  avatarHue,
  formatDateTime,
  formatDay,
  formatDayYear,
  formatNumber,
  initials,
  periodFromQuery,
  periodToQuery,
  resolvePeriod,
  txTitle,
  weekday,
  type PeriodState,
} from "./coinMeta";

ChartJS.register(Tooltip, BarElement, BarController, LineElement, LineController, PointElement, CategoryScale, LinearScale);

const route = useRoute();
const router = useRouter();
const coinStore = useCoinStore();
const themeStore = useThemeStore();
const isMobile = useIsMobile();

const userId = computed(() => Number(route.params.userId));
const period = ref<PeriodState>(periodFromQuery(route.query));
const data = ref<UserCoinsDto | null>(null);
const loading = ref(true);
const profileOpen = ref(false);

const load = async () => {
  loading.value = true;
  try {
    data.value = await coinStore.getUserCoins(userId.value, resolvePeriod(period.value));
  } catch {
    data.value = null;
  } finally {
    loading.value = false;
  }
};

watch(period, () => {
  router.replace({ query: periodToQuery(period.value) });
  load();
});

const back = () => router.push({ name: "coin_ranking", query: periodToQuery(period.value) });

const d = computed(() => data.value);
const maxDaily = computed(() => d.value?.maxDailyCoins ?? 22);
// Har kun o'sha kunda amal qilgan qoida bo'yicha (qoida dashboard'dan o'zgarishi mumkin).
const dayLimit = (day: { maxDailyCoins?: number }) => day.maxDailyCoins || maxDaily.value;

// ── Kunlar ─────────────────────────────────────────────────────────
const onlyCoinDays = ref(true);
const tableDays = computed(() => {
  const days = [...(d.value?.days ?? [])].reverse();
  return onlyCoinDays.value ? days.filter((x) => x.earned > 0 || x.spent > 0) : days;
});
const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString();

// ── Grafik ─────────────────────────────────────────────────────────
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const gridColor = ref("#eaecf1");
const tickColor = ref("#94a3b8");
const refreshThemeColors = () => {
  gridColor.value = cssVar("--border") || "#eaecf1";
  tickColor.value = cssVar("--text-faint") || "#94a3b8";
};
watch(() => themeStore.mode, () => setTimeout(refreshThemeColors, 50));

const chartData = computed(() => {
  const days = d.value?.days ?? [];
  return {
    labels: days.map((x) => formatDay(x.date)),
    datasets: [
      { type: "bar" as const, label: "Coin", data: days.map((x) => x.earned), backgroundColor: "#7cc243", borderRadius: 3, maxBarThickness: 22, order: 2 },
      {
        type: "line" as const,
        label: "Limit",
        data: days.map((x) => dayLimit(x)),
        borderColor: "#f79009",
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        order: 1,
      },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items: any[]) => {
          const day = d.value?.days[items[0]?.dataIndex ?? 0];
          return day ? `${formatDayYear(day.date)}, ${weekday(day.date)}` : "";
        },
        footer: (items: any[]) => {
          const day = d.value?.days[items[0]?.dataIndex ?? 0];
          return day ? `Qadam: ${formatNumber(day.steps)}` : "";
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: tickColor.value, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 10 } },
    y: { beginAtZero: true, grid: { color: gridColor.value }, ticks: { color: tickColor.value, font: { size: 10 }, precision: 0 } },
  },
}));

// ── Hamyon tarixi ──────────────────────────────────────────────────
const txRows = ref<CoinTransactionDto[]>([]);
const txTotal = ref(0);
const txPage = ref(1);
const txPageSize = 15;
const txType = ref<CoinTxType | "">("");
const txLoading = ref(false);

const loadTx = async () => {
  txLoading.value = true;
  try {
    const res = await coinStore.getUserTransactions(userId.value, (txPage.value - 1) * txPageSize, txPageSize, txType.value);
    txRows.value = res?.content ?? [];
    txTotal.value = res?.total ?? 0;
  } finally {
    txLoading.value = false;
  }
};

watch(txType, () => {
  txPage.value = 1;
  loadTx();
});

watch(userId, (id) => {
  if (!id) return;
  txPage.value = 1;
  load();
  loadTx();
});

onMounted(() => {
  refreshThemeColors();
  load();
  loadTx();
});

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

const rankColor = computed(() => (d.value?.rank && d.value.rank <= 3 ? MEDAL_COLORS[d.value.rank - 1] : null));
</script>

<template>
  <div class="page">
    <header class="page-head">
      <button class="back" @click="back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Reyting
      </button>
      <PeriodFilter v-model="period" />
    </header>

    <div v-if="loading && !d" class="app-card box-pad"><ElSkeleton :rows="5" animated /></div>
    <div v-else-if="!d" class="app-card box-pad empty">Foydalanuvchi topilmadi</div>

    <template v-else>
      <section class="app-card box-pad person">
        <img v-if="d.photo" :src="makeFileUrl(d.photo)" class="big-avatar" />
        <span v-else class="big-avatar" :style="avatarStyle(d.userId)">{{ initials(d.name) }}</span>
        <div class="min-w-0 flex-1">
          <h1 class="p-name">
            {{ d.name || "—" }}
            <span v-if="d.rank" class="chip c-orange" :style="rankColor ? { color: rankColor } : {}">#{{ d.rank }}</span>
          </h1>
          <p class="p-sub">
            <span>ID {{ d.userId }}</span>
            <span v-if="d.phone"> · <CopyText :text="d.phone" /></span>
            <span v-else-if="d.email"> · <CopyText :text="d.email" /></span>
          </p>
        </div>
        <ElButton size="small" plain @click="profileOpen = true">Profil</ElButton>
      </section>

      <div class="kpis">
        <div class="app-card kpi">
          <span class="kpi-label">Davrda yig'gan</span>
          <span class="kpi-value coin">{{ formatNumber(d.earned) }}</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Balans</span>
          <span class="kpi-value">{{ formatNumber(d.balance) }}</span>
          <span v-if="d.totalSpent" class="kpi-sub">sarflagan {{ formatNumber(d.totalSpent) }}</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Faol kun</span>
          <span class="kpi-value">{{ d.activeDays }}</span>
          <span v-if="d.maxedDays" class="kpi-sub">{{ d.maxedDays }} kun limit</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Bugun</span>
          <span class="kpi-value">{{ d.todayCoins }}<small>/ {{ d.maxDailyCoins }}</small></span>
        </div>
      </div>

      <section v-if="d.days.length > 1" class="app-card box-pad">
        <div class="chart-box"><Bar :data="chartData as any" :options="chartOptions" /></div>
      </section>

      <section class="app-card box">
        <div class="box-head">
          <h2 class="box-title">Kunlar</h2>
          <label class="switch-label"><ElSwitch v-model="onlyCoinDays" size="small" /> Faqat coinli</label>
        </div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Sana</th>
                <th class="num">Qadam</th>
                <th>Coin</th>
                <th class="num hide-sm">Sarf</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in tableDays" :key="day.date">
                <td class="nowrap">
                  {{ formatDay(day.date) }} <span class="faint">{{ weekday(day.date) }}</span>
                  <span v-if="isToday(day.date)" class="chip c-blue">bugun</span>
                </td>
                <td class="num">{{ day.steps ? formatNumber(day.steps) : "—" }}</td>
                <td>
                  <div class="coin-cell">
                    <div class="bar-track"><div class="bar-fill" :class="{ full: day.stepCoins >= dayLimit(day) }" :style="{ width: Math.min(day.stepCoins / dayLimit(day), 1) * 100 + '%' }" /></div>
                    <b>{{ day.earned }}</b>
                  </div>
                </td>
                <td class="num hide-sm">
                  <span v-if="day.spent" class="minus">−{{ formatNumber(day.spent) }}</span>
                  <span v-else class="faint">—</span>
                </td>
              </tr>
              <tr v-if="!tableDays.length">
                <td colspan="4" class="empty">Coin yig'ilmagan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <section v-if="d" class="app-card box">
      <div class="box-head">
        <h2 class="box-title">Hamyon tarixi</h2>
        <ElSelect v-model="txType" placeholder="Barcha turlar" clearable class="type-select">
          <ElOption v-for="t in TX_TYPES" :key="t.value" :label="t.label" :value="t.value" />
        </ElSelect>
      </div>
      <div class="tbl-wrap" v-loading="txLoading">
        <table class="tbl">
          <tbody>
            <tr v-for="row in txRows" :key="row.id">
              <td>
                <p class="u-name">{{ txTitle(row.title) }}</p>
                <p class="u-sub">
                  {{ formatDateTime(row.createdAt) }}
                  <template v-if="row.stepDate"> · {{ formatDay(row.stepDate) }} uchun<template v-if="row.steps != null">, {{ formatNumber(row.steps) }} qadam</template></template>
                </p>
              </td>
              <td class="hide-sm"><span class="chip c-gray">{{ TX_TYPE_LABEL[row.type] ?? row.type }}</span></td>
              <td class="num nowrap">
                <b :class="row.amount >= 0 ? 'plus' : 'minus'">{{ row.amount >= 0 ? "+" : "−" }}{{ formatNumber(Math.abs(row.amount)) }}</b>
              </td>
            </tr>
            <tr v-if="!txRows.length && !txLoading">
              <td colspan="3" class="empty">Yozuvlar yo'q</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="txTotal > txPageSize" class="pager">
        <ElPagination
          background
          :small="isMobile"
          :pager-count="isMobile ? 5 : 7"
          layout="prev, pager, next"
          :total="txTotal"
          :page-size="txPageSize"
          :current-page="txPage"
          @current-change="(p: number) => { txPage = p; loadTx(); }"
        />
      </div>
    </section>

    <UserDetailDrawer v-model="profileOpen" :user-id="userId" />
  </div>
</template>

<style scoped src="./admin.css"></style>
<style scoped>
.person { display: flex; align-items: center; gap: 12px; }
.big-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800; }
.p-name { font-size: 17px; font-weight: 800; color: var(--text); display: flex; align-items: center; gap: 8px; min-width: 0; }
.p-sub { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }
.chart-box { height: 220px; }
.switch-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-muted); cursor: pointer; }
.coin-cell { display: flex; align-items: center; gap: 8px; min-width: 90px; }
.coin-cell .bar-track { flex: 1; max-width: 120px; }
.bar-fill.full { background: var(--warning); }
.type-select { width: 170px; }
@media (max-width: 640px) {
  .chart-box { height: 170px; }
  .type-select { width: 100%; }
}
</style>
