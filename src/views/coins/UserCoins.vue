<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";
import {
  ElButton,
  ElOption,
  ElPagination,
  ElSelect,
  ElSkeleton,
  ElSwitch,
  ElTable,
  ElTableColumn,
} from "element-plus";
import { useCoinStore } from "../../stores/coinStore";
import { useThemeStore } from "../../stores/themeStore";
import { makeFileUrl } from "../../integrations/axios";
import type { CoinTransactionDto, CoinTxType, UserCoinsDto } from "../../@types/coin";
import Card from "../../components/ui/Card.vue";
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
  periodLabel,
  periodToQuery,
  resolvePeriod,
  txTitle,
  weekday,
  type PeriodState,
} from "./coinMeta";

ChartJS.register(
  Tooltip,
  Legend,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  CategoryScale,
  LinearScale,
);

const route = useRoute();
const router = useRouter();
const coinStore = useCoinStore();
const themeStore = useThemeStore();

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

const backToRanking = () =>
  router.push({ name: "coin_ranking", query: periodToQuery(period.value) });

const d = computed(() => data.value);
const maxDaily = computed(() => d.value?.maxDailyCoins ?? 22);
// Har kun o'sha kunda amal qilgan qoida bo'yicha (qoida dashboard'dan o'zgarishi mumkin).
const dayLimit = (day: { maxDailyCoins?: number }) => day.maxDailyCoins || maxDaily.value;
const rateChanged = computed(() => {
  const days = d.value?.days ?? [];
  return new Set(days.map((x) => `${x.stepsPerCoin}/${x.maxDailyCoins}`)).size > 1;
});

// ── Kunlar jadvali ────────────────────────────────────────────────
const onlyCoinDays = ref(false);
const tableDays = computed(() => {
  const days = [...(d.value?.days ?? [])].reverse();
  return onlyCoinDays.value ? days.filter((x) => x.earned > 0 || x.spent > 0) : days;
});
const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString();

// ── Grafik ────────────────────────────────────────────────────────
const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const gridColor = ref("#eaecf1");
const tickColor = ref("#94a3b8");
const refreshThemeColors = () => {
  gridColor.value = cssVar("--border") || "#eaecf1";
  tickColor.value = cssVar("--text-faint") || "#94a3b8";
};
watch(() => themeStore.mode, () => setTimeout(refreshThemeColors, 50));

const hasBonus = computed(() => (d.value?.days ?? []).some((x) => x.bonusCoins > 0));

const chartData = computed(() => {
  const days = d.value?.days ?? [];
  const datasets: any[] = [
    {
      type: "bar",
      label: "Qadam coini",
      data: days.map((x) => x.stepCoins),
      backgroundColor: "#7cc243",
      borderRadius: 4,
      maxBarThickness: 26,
      stack: "coins",
      order: 2,
    },
  ];
  if (hasBonus.value)
    datasets.push({
      type: "bar",
      label: "Bonus",
      data: days.map((x) => x.bonusCoins),
      backgroundColor: "#7a5af8",
      borderRadius: 4,
      maxBarThickness: 26,
      stack: "coins",
      order: 2,
    });
  datasets.push({
    type: "line",
    label: rateChanged.value ? "Kunlik limit" : `Kunlik limit (${maxDaily.value})`,
    data: days.map((x) => dayLimit(x)),
    borderColor: "#f79009",
    borderWidth: 1.5,
    borderDash: [5, 4],
    pointRadius: 0,
    pointHoverRadius: 0,
    order: 1,
  });
  return { labels: days.map((x) => formatDay(x.date)), datasets };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: {
      position: "top" as const,
      align: "end" as const,
      labels: { color: tickColor.value, boxWidth: 10, boxHeight: 10, usePointStyle: true },
    },
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
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { color: tickColor.value, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 8 },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      suggestedMax: Math.max(maxDaily.value, ...(d.value?.days ?? []).map((x) => dayLimit(x))) + 2,
      grid: { color: gridColor.value },
      ticks: { color: tickColor.value, font: { size: 11 }, precision: 0 },
    },
  },
}));

// ── Hamyon tarixi ─────────────────────────────────────────────────
const txRows = ref<CoinTransactionDto[]>([]);
const txTotal = ref(0);
const txPage = ref(1);
const txPageSize = 15;
const txType = ref<CoinTxType | "">("");
const txLoading = ref(false);

const loadTx = async () => {
  txLoading.value = true;
  try {
    const res = await coinStore.getUserTransactions(
      userId.value,
      (txPage.value - 1) * txPageSize,
      txPageSize,
      txType.value,
    );
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

const onTxPage = (p: number) => {
  txPage.value = p;
  loadTx();
};

// Boshqa userga o'tilganda (masalan, brauzer tarixi orqali) qayta yuklash.
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

const rankColor = computed(() =>
  d.value?.rank && d.value.rank <= 3 ? MEDAL_COLORS[d.value.rank - 1] : null,
);
</script>

<template>
  <div class="page">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <button class="back" @click="backToRanking">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Coin reytingi
      </button>
      <PeriodFilter v-model="period" />
    </div>

    <div v-if="loading && !d" class="app-card p-6"><ElSkeleton :rows="6" animated /></div>

    <div v-else-if="!d" class="app-card p-10 text-center" style="color: var(--text-faint)">
      Foydalanuvchi topilmadi
    </div>

    <template v-else>
      <!-- Foydalanuvchi -->
      <section class="app-card user-head">
        <div class="flex items-center gap-4 min-w-0">
          <img v-if="d.photo" :src="makeFileUrl(d.photo)" class="big-avatar" />
          <span v-else class="big-avatar" :style="avatarStyle(d.userId)">{{ initials(d.name) }}</span>
          <div class="min-w-0">
            <h1 class="user-title">{{ d.name || "—" }}</h1>
            <div class="user-meta">
              <span>ID #{{ d.userId }}</span>
              <span v-if="new Date(d.registeredAt).getFullYear() > 2000">
                · Ro'yxatdan o'tgan {{ formatDayYear(d.registeredAt) }}
              </span>
            </div>
            <div class="contacts">
              <span v-if="d.phone" class="contact"><CopyText :text="d.phone" /></span>
              <span v-if="d.email" class="contact"><CopyText :text="d.email" /></span>
            </div>
          </div>
        </div>
        <div class="head-right">
          <div class="rank-box" :style="rankColor ? { borderColor: rankColor + '88', background: rankColor + '14' } : {}">
            <span class="rank-label">Reytingdagi o'rni</span>
            <span class="rank-value" :style="rankColor ? { color: rankColor } : {}">
              {{ d.rank ? `#${d.rank}` : "—" }}
            </span>
            <span class="rank-sub">{{ formatNumber(d.participants) }} ishtirokchidan</span>
          </div>
          <ElButton plain @click="profileOpen = true">Profil ma'lumotlari</ElButton>
        </div>
      </section>

      <p class="period-note">
        <b>{{ periodLabel(d.from, d.to) }}</b> davri bo'yicha · qadam coini qadam yurilgan kunga yoziladi
      </p>

      <!-- KPI: davr -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="app-card kpi">
          <span class="kpi-label">Davrda yig'gan</span>
          <span class="kpi-value coin">{{ formatNumber(d.earned) }}</span>
          <span class="kpi-sub">
            qadamdan {{ formatNumber(d.stepCoins) }}<template v-if="d.bonusCoins"> · bonus {{ formatNumber(d.bonusCoins) }}</template>
          </span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Faol kunlar</span>
          <span class="kpi-value">{{ d.activeDays }}</span>
          <span class="kpi-sub">{{ d.maxedDays }} kun limitga ({{ d.maxDailyCoins }} coin) yetgan</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Eng yaxshi kun</span>
          <span class="kpi-value">{{ d.bestDay ? formatNumber(d.bestDay.earned) : "—" }}</span>
          <span class="kpi-sub">
            {{ d.bestDay ? `${formatDayYear(d.bestDay.date)} · ${formatNumber(d.bestDay.steps)} qadam` : "coin yig'ilmagan" }}
          </span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Jami qadam</span>
          <span class="kpi-value">{{ formatNumber(d.totalSteps) }}</span>
          <span class="kpi-sub">
            {{ d.activeDays ? `o'rtacha ${formatNumber(Math.round(d.stepCoins / d.activeDays))} coin / kun` : "—" }}
          </span>
        </div>
      </div>

      <!-- Hamyon (umumiy) -->
      <div class="wallet-strip app-card">
        <div class="wallet-item">
          <span class="w-label">Joriy balans</span>
          <span class="w-value">{{ formatNumber(d.balance) }}</span>
        </div>
        <div class="wallet-item">
          <span class="w-label">Umr bo'yi yig'gan</span>
          <span class="w-value">{{ formatNumber(d.totalEarned) }}</span>
        </div>
        <div class="wallet-item">
          <span class="w-label">Sarflagan (do'kon)</span>
          <span class="w-value">{{ formatNumber(d.totalSpent) }}</span>
        </div>
        <div class="wallet-item">
          <span class="w-label">Bugun</span>
          <span class="w-value">{{ d.todayCoins }} / {{ d.maxDailyCoins }}</span>
        </div>
      </div>

      <!-- Grafik -->
      <Card title="Kunma-kun coinlar" subtitle="Har kuni qadamdan yig'ilgan coin va kunlik limit">
        <div v-if="d.days.length" class="h-[280px] min-w-[520px]">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <p v-else class="py-10 text-center text-[13px]" style="color: var(--text-faint)">
          Bu davrda kunlar yo'q
        </p>
      </Card>

      <!-- Kunlar jadvali -->
      <section class="app-card table-card">
        <div class="table-toolbar">
          <div>
            <h2 class="section-title">Qaysi kuni qancha coin yig'gan</h2>
            <p class="section-sub">
              Hozir {{ formatNumber(d.stepsPerCoin) }} qadam = 1 coin, kuniga ko'pi bilan {{ d.maxDailyCoins }} coin
              <template v-if="rateChanged"> · har kun o'sha kundagi qoida bo'yicha</template>
            </p>
          </div>
          <label class="switch-label">
            <ElSwitch v-model="onlyCoinDays" size="small" />
            Faqat coin yig'ilgan kunlar
          </label>
        </div>
        <div class="table-wrap">
          <table class="lb">
            <thead>
              <tr>
                <th>Sana</th>
                <th class="num">Qadamlar</th>
                <th>Qadam coini</th>
                <th class="num">Bonus</th>
                <th class="num">Sarflangan</th>
                <th class="num">Jami yig'gan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in tableDays" :key="day.date" :class="{ zero: !day.earned && !day.spent }">
                <td class="nowrap">
                  <b>{{ formatDayYear(day.date) }}</b>
                  <span class="wd">{{ weekday(day.date) }}</span>
                  <span v-if="isToday(day.date)" class="today">bugun</span>
                </td>
                <td class="num">{{ day.steps ? formatNumber(day.steps) : "—" }}</td>
                <td>
                  <div class="coin-bar">
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        :class="{ full: day.stepCoins >= dayLimit(day) }"
                        :style="{ width: Math.min(day.stepCoins / dayLimit(day), 1) * 100 + '%' }"
                      />
                    </div>
                    <span class="bar-num">{{ day.stepCoins }}</span>
                    <span v-if="day.stepCoins >= dayLimit(day)" class="limit-tag">limit</span>
                    <span v-if="rateChanged && day.stepsPerCoin" class="rate-tag" :title="`O'sha kuni: ${day.stepsPerCoin} qadam = 1 coin, limit ${day.maxDailyCoins}`">{{ formatNumber(day.stepsPerCoin) }}/coin</span>
                  </div>
                </td>
                <td class="num">
                  <span v-if="day.bonusCoins" class="bonus">+{{ formatNumber(day.bonusCoins) }}</span>
                  <span v-else class="faint">—</span>
                </td>
                <td class="num">
                  <span v-if="day.spent" class="spent">−{{ formatNumber(day.spent) }}</span>
                  <span v-else class="faint">—</span>
                </td>
                <td class="num"><b class="earned">{{ day.earned ? formatNumber(day.earned) : "0" }}</b></td>
              </tr>
              <tr v-if="!tableDays.length">
                <td colspan="6" class="empty">Bu davrda coin yig'ilmagan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- Hamyon tarixi (butun vaqt) -->
    <section v-if="d" class="app-card table-card">
      <div class="table-toolbar">
        <div>
          <h2 class="section-title">Hamyon tarixi</h2>
          <p class="section-sub">Barcha kirim va chiqimlar (butun vaqt)</p>
        </div>
        <ElSelect v-model="txType" placeholder="Barcha turlar" clearable class="!w-[190px]">
          <ElOption v-for="t in TX_TYPES" :key="t.value" :label="t.label" :value="t.value" />
        </ElSelect>
      </div>
      <ElTable :data="txRows" v-loading="txLoading" size="small" style="width: 100%" empty-text="Yozuvlar yo'q">
        <ElTableColumn label="Yozilgan vaqt" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </ElTableColumn>
        <ElTableColumn label="Turi" width="120">
          <template #default="{ row }">
            <span class="type-tag" :class="`t-${row.type}`">{{ TX_TYPE_LABEL[row.type] ?? row.type }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Tavsif" min-width="200">
          <template #default="{ row }">
            <span>{{ txTitle(row.title) }}</span>
            <span v-if="row.stepDate" class="faint">
              · {{ formatDayYear(row.stepDate) }}<template v-if="row.steps != null">, {{ formatNumber(row.steps) }} qadam</template>
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Miqdor" width="110" align="right">
          <template #default="{ row }">
            <b :class="row.amount >= 0 ? 'plus' : 'minus'">
              {{ row.amount >= 0 ? "+" : "−" }}{{ formatNumber(Math.abs(row.amount)) }}
            </b>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="txTotal > txPageSize" class="pager">
        <ElPagination
          background
          layout="prev, pager, next"
          :total="txTotal"
          :page-size="txPageSize"
          :current-page="txPage"
          @current-change="onTxPage"
        />
      </div>
    </section>

    <UserDetailDrawer v-model="profileOpen" :user-id="userId" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.back {
  display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600;
  color: var(--text-muted); padding: 6px 10px 6px 4px; border-radius: 10px; transition: all 0.15s ease;
}
.back:hover { color: var(--text); background: var(--surface-hover); }
.back svg { width: 18px; height: 18px; }

.user-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 20px; }
.big-avatar {
  width: 64px; height: 64px; border-radius: 18px; flex-shrink: 0; object-fit: cover;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px;
}
.user-title { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-meta { font-size: 12.5px; color: var(--text-faint); display: flex; flex-wrap: wrap; gap: 4px; }
.contacts { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 6px; font-size: 13px; color: var(--text); }
.head-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rank-box {
  display: flex; flex-direction: column; align-items: center; padding: 8px 18px; border-radius: 14px;
  border: 1px solid var(--border); background: var(--surface-2); min-width: 130px;
}
.rank-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); }
.rank-value { font-size: 26px; font-weight: 800; color: var(--text); line-height: 1.2; }
.rank-sub { font-size: 11.5px; color: var(--text-faint); }

.period-note { font-size: 12.5px; color: var(--text-faint); margin-top: -6px; }
.period-note b { color: var(--text); font-weight: 700; }

.kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kpi-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); }
.kpi-value { font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.kpi-value.coin { color: var(--warning); }
.kpi-sub { font-size: 12px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.wallet-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 0; }
.wallet-item { display: flex; flex-direction: column; gap: 2px; padding: 12px 18px; }
.wallet-item + .wallet-item { border-left: 1px solid var(--border); }
.w-label { font-size: 12px; color: var(--text-faint); }
.w-value { font-size: 16px; font-weight: 700; color: var(--text); }

.table-card { padding: 0; overflow: hidden; }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 16px 18px; }
.section-title { font-weight: 700; font-size: 16px; color: var(--text); }
.section-sub { font-size: 12.5px; color: var(--text-faint); margin-top: 1px; }
.switch-label { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer; }
.table-wrap { overflow-x: auto; max-height: 520px; overflow-y: auto; }
.lb { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 640px; }
.lb th {
  position: sticky; top: 0; z-index: 1;
  text-align: left; padding: 11px 16px; font-size: 11.5px; font-weight: 600; white-space: nowrap;
  color: var(--text-faint); background: var(--surface-2); text-transform: uppercase; letter-spacing: 0.3px;
}
.lb td { padding: 10px 16px; border-top: 1px solid var(--border); color: var(--text); }
.lb .num, .lb th.num { text-align: right; }
.lb tr.zero td { color: var(--text-faint); }
.nowrap { white-space: nowrap; }
.wd { margin-left: 6px; font-size: 12px; color: var(--text-faint); }
.today {
  margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: var(--info-soft); color: var(--info);
}
.coin-bar { display: flex; align-items: center; gap: 8px; min-width: 170px; }
.bar-track { flex: 1; height: 7px; border-radius: 999px; background: var(--surface-hover); overflow: hidden; max-width: 130px; }
.bar-fill { height: 100%; border-radius: 999px; background: var(--brand); }
.bar-fill.full { background: var(--success); }
.bar-num { font-weight: 700; min-width: 20px; text-align: right; }
.limit-tag {
  padding: 1px 6px; border-radius: 999px; font-size: 10.5px; font-weight: 700;
  background: var(--success-soft); color: var(--success);
}
.rate-tag {
  padding: 1px 6px; border-radius: 999px; font-size: 10.5px; font-weight: 600; white-space: nowrap;
  background: var(--surface-2); color: var(--text-faint);
}
.earned { font-weight: 800; color: var(--warning); }
.lb tr.zero .earned { color: var(--text-faint); font-weight: 600; }
.bonus { color: var(--purple); font-weight: 600; }
.spent { color: var(--danger); font-weight: 600; }
.faint { color: var(--text-faint); }
.empty { text-align: center; color: var(--text-faint); padding: 30px; }

.type-tag { padding: 2px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 600; background: var(--surface-hover); color: var(--text-muted); }
.t-Steps { background: var(--brand-soft); color: var(--brand-strong); }
.t-Referral { background: var(--purple-soft); color: var(--purple); }
.t-Purchase { background: var(--danger-soft); color: var(--danger); }
.t-Admin { background: var(--info-soft); color: var(--info); }
.plus { color: var(--success); }
.minus { color: var(--danger); }
.pager { display: flex; justify-content: flex-end; padding: 14px 16px; border-top: 1px solid var(--border); }

@media (max-width: 700px) {
  .wallet-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wallet-item:nth-child(3) { border-left: none; }
  .wallet-item:nth-child(n + 3) { border-top: 1px solid var(--border); }
  .head-right { width: 100%; justify-content: space-between; }
}
</style>
