<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";
import { ElButton, ElInput, ElOption, ElPagination, ElSelect } from "element-plus";
import { useReferralStore } from "../../stores/referralStore";
import { useThemeStore } from "../../stores/themeStore";
import { makeFileUrl } from "../../integrations/axios";
import type { ReferralRowDto, ReferralStatus, ReferralSummaryDto, ReferrerRowDto, ReferrerSort } from "../../@types/referral";
import { useIsMobile } from "../../composables/useIsMobile";
import PeriodFilter from "../coins/PeriodFilter.vue";
import {
  MEDAL_COLORS,
  avatarHue,
  formatDateTime,
  formatDay,
  formatDayYear,
  formatNumber,
  formatPercent,
  formatSom,
  initials,
  periodFromQuery,
  periodToQuery,
  relativeTime,
  resolvePeriod,
  type PeriodState,
} from "../coins/coinMeta";
import { SORTS, STATUS_FILTERS, STATUS_META } from "./referralMeta";

ChartJS.register(Tooltip, Legend, BarElement, BarController, CategoryScale, LinearScale);

const route = useRoute();
const router = useRouter();
const referralStore = useReferralStore();
const themeStore = useThemeStore();
const isMobile = useIsMobile();

const period = ref<PeriodState>(periodFromQuery(route.query));
const apiPeriod = computed(() => resolvePeriod(period.value));
const tab = ref<"referrers" | "referrals">(route.query.tab === "referrals" ? "referrals" : "referrers");

const summary = ref<ReferralSummaryDto | null>(null);
const s = computed(() => summary.value);

const loadSummary = async () => {
  summary.value = await referralStore.getSummary(apiPeriod.value);
};

const syncQuery = () =>
  router.replace({ query: { ...periodToQuery(period.value), ...(tab.value === "referrals" ? { tab: "referrals" } : {}) } });

// ── Voronka ─────────────────────────────────────────────────────────
const funnel = computed(() => {
  const x = s.value;
  if (!x) return [];
  const steps = [
    { label: "Ulashildi", value: x.codesCreated, color: "#98a2b3" },
    { label: "Kod kiritdi", value: x.invited, color: "#2e90fa" },
    { label: "Faol", value: x.activated, color: "#7cc243" },
    { label: "To'lov", value: x.paid, color: "#f79009" },
  ];
  const max = Math.max(...steps.map((st) => st.value), 1);
  return steps.map((st, i) => ({
    ...st,
    width: Math.max((st.value / max) * 100, st.value ? 3 : 0),
    conv: i > 0 && steps[i - 1].value > 0 ? st.value / steps[i - 1].value : null,
  }));
});

// ── Grafik ──────────────────────────────────────────────────────────
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const gridColor = ref("#eaecf1");
const tickColor = ref("#94a3b8");
const refreshThemeColors = () => {
  gridColor.value = cssVar("--border") || "#eaecf1";
  tickColor.value = cssVar("--text-faint") || "#94a3b8";
};
watch(() => themeStore.mode, () => setTimeout(refreshThemeColors, 50));

const chartData = computed(() => {
  const days = s.value?.days ?? [];
  return {
    labels: days.map((x) => formatDay(x.date)),
    datasets: [
      { label: "Kod kiritdi", data: days.map((x) => x.invited), backgroundColor: "#2e90fa", borderRadius: 3, maxBarThickness: 16 },
      { label: "Faol", data: days.map((x) => x.activated), backgroundColor: "#7cc243", borderRadius: 3, maxBarThickness: 16 },
      { label: "To'lov", data: days.map((x) => x.firstPayments), backgroundColor: "#f79009", borderRadius: 3, maxBarThickness: 16 },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: { position: "top" as const, align: "end" as const, labels: { color: tickColor.value, boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11 } } },
    tooltip: {
      callbacks: {
        title: (items: any[]) => {
          const day = s.value?.days[items[0]?.dataIndex ?? 0];
          return day ? formatDayYear(day.date) : "";
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: tickColor.value, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 10 } },
    y: { beginAtZero: true, grid: { color: gridColor.value }, ticks: { color: tickColor.value, font: { size: 10 }, precision: 0 } },
  },
}));

// ── Taklif qiluvchilar ──────────────────────────────────────────────
const sort = ref<ReferrerSort>("invited");
const rSearch = ref("");
const rPage = ref(1);
const rSize = 20;
const referrers = ref<ReferrerRowDto[]>([]);
const rTotal = ref(0);
const rLoading = ref(false);

const loadReferrers = async () => {
  rLoading.value = true;
  try {
    const res = await referralStore.getReferrers(apiPeriod.value, (rPage.value - 1) * rSize, rSize, sort.value, rSearch.value);
    referrers.value = res?.content ?? [];
    rTotal.value = res?.total ?? 0;
  } finally {
    rLoading.value = false;
  }
};

watch(sort, () => {
  rPage.value = 1;
  loadReferrers();
});

// ── Takliflar ───────────────────────────────────────────────────────
const status = ref<ReferralStatus | "">("");
const lSearch = ref("");
const lPage = ref(1);
const lSize = 20;
const rows = ref<ReferralRowDto[]>([]);
const lTotal = ref(0);
const lLoading = ref(false);

const loadReferrals = async () => {
  lLoading.value = true;
  try {
    const res = await referralStore.getReferrals({
      period: apiPeriod.value,
      skip: (lPage.value - 1) * lSize,
      take: lSize,
      status: status.value,
      search: lSearch.value,
    });
    rows.value = res?.content ?? [];
    lTotal.value = res?.total ?? 0;
  } finally {
    lLoading.value = false;
  }
};

watch(status, () => {
  lPage.value = 1;
  loadReferrals();
});

const debounce = (fn: () => void) => {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, 350);
  };
};
watch(rSearch, debounce(() => { rPage.value = 1; loadReferrers(); }));
watch(lSearch, debounce(() => { lPage.value = 1; loadReferrals(); }));
watch(tab, syncQuery);

watch(period, () => {
  syncQuery();
  rPage.value = 1;
  lPage.value = 1;
  reload();
});

const reload = () => Promise.all([loadSummary(), loadReferrers(), loadReferrals()]);

onMounted(() => {
  refreshThemeColors();
  reload();
});

const openReferrer = (userId: number) => router.push({ name: "referrer_detail", params: { userId } });

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

const downloadCsv = (name: string, header: string[], lines: unknown[][]) => {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob(["﻿" + [header.map(esc).join(","), ...lines.map((l) => l.map(esc).join(","))].join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const p = apiPeriod.value;
  a.href = url;
  a.download = `${name}_${p.from ?? "boshidan"}_${p.to ?? "bugungacha"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportCsv = () =>
  tab.value === "referrers"
    ? downloadCsv(
        "referral-reyting",
        ["O'rin", "User ID", "Ism", "Email", "Telefon", "Taklif", "Faol", "To'lov", "Tushum (so'm)", "Premium olgan", "Oxirgi taklif"],
        referrers.value.map((r) => [
          r.rank, r.userId, r.name, r.email, r.phone, r.invited, r.activated, r.paid, Math.round(r.revenue), r.premiumGrants, formatDateTime(r.lastInviteAt),
        ]),
      )
    : downloadCsv(
        "referral-takliflar",
        ["Sana", "Taklif qiluvchi ID", "Taklif qiluvchi", "Do'st ID", "Do'st", "Do'st kontakti", "Kod", "Holat", "Tushum (so'm)"],
        rows.value.map((r) => [
          formatDateTime(r.createdAt), r.referrerId, r.referrerName, r.referredUserId, r.referredName, r.referredContact, r.code,
          STATUS_META[r.status]?.label ?? r.status, Math.round(r.revenue),
        ]),
      );
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1 class="page-title">Do'st taklifi</h1>
      <PeriodFilter v-model="period" />
    </header>

    <div class="kpis">
      <div class="app-card kpi">
        <span class="kpi-label">Taklif qilindi</span>
        <span class="kpi-value">{{ formatNumber(s?.invited) }}</span>
        <span class="kpi-sub">{{ formatNumber(s?.referrers) }} kishi taklif qildi</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Faol bo'ldi</span>
        <span class="kpi-value">{{ formatNumber(s?.activated) }}<small>{{ formatPercent(s?.activationRate, 0) }}</small></span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">To'lov qildi</span>
        <span class="kpi-value">{{ formatNumber(s?.paid) }}<small>{{ formatPercent(s?.paidRate, 0) }}</small></span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Tushum</span>
        <span class="kpi-value money">{{ formatSom(s?.revenue) }}</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Yangi userlardan</span>
        <span class="kpi-value">{{ formatPercent(s?.referralShareOfNewUsers) }}</span>
        <span class="kpi-sub">{{ formatNumber(s?.newUsersReferred) }} / {{ formatNumber(s?.newUsers) }}</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Premium berildi</span>
        <span class="kpi-value">{{ formatNumber(s?.premiumGrants) }}<small>{{ formatNumber(s?.premiumDaysGranted) }} kun</small></span>
      </div>
    </div>

    <div class="overview">
      <section class="app-card box-pad">
        <div class="funnel">
          <div v-for="f in funnel" :key="f.label" class="f-row">
            <span class="f-label">{{ f.label }}</span>
            <div class="f-track"><div class="f-bar" :style="{ width: f.width + '%', background: f.color }" /></div>
            <span class="f-value">{{ formatNumber(f.value) }}</span>
            <span class="f-conv">{{ f.conv !== null ? formatPercent(f.conv, 0) : "" }}</span>
          </div>
        </div>
      </section>
      <section v-if="!isMobile" class="app-card box-pad">
        <div class="chart-box"><Bar :data="chartData" :options="chartOptions" /></div>
      </section>
    </div>

    <section class="app-card box">
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'referrers' }" @click="tab = 'referrers'">
          Taklif qiluvchilar <span class="count">{{ formatNumber(rTotal) }}</span>
        </button>
        <button class="tab" :class="{ active: tab === 'referrals' }" @click="tab = 'referrals'">
          Takliflar <span class="count">{{ formatNumber(lTotal) }}</span>
        </button>
      </div>

      <template v-if="tab === 'referrers'">
        <div class="box-head">
          <div class="tools">
            <ElSelect v-model="sort" class="sel">
              <ElOption v-for="o in SORTS" :key="o.value" :label="o.label" :value="o.value" />
            </ElSelect>
            <ElInput v-model="rSearch" clearable placeholder="Ism, telefon yoki ID" class="search" />
            <ElButton plain class="hide-sm" :disabled="!referrers.length" @click="exportCsv">CSV</ElButton>
          </div>
        </div>
        <div class="tbl-wrap" v-loading="rLoading">
          <table class="tbl">
            <thead>
              <tr>
                <th class="rank">#</th>
                <th>Foydalanuvchi</th>
                <th class="num">Taklif</th>
                <th class="num">Faol</th>
                <th class="num hide-sm">To'lov</th>
                <th class="num hide-sm">Tushum</th>
                <th class="num hide-sm">Oxirgi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in referrers" :key="r.userId" class="click" @click="openReferrer(r.userId)">
                <td class="rank" :style="r.rank <= 3 ? { color: MEDAL_COLORS[r.rank - 1] } : {}">{{ r.rank }}</td>
                <td>
                  <div class="user">
                    <img v-if="r.photo" :src="makeFileUrl(r.photo)" class="avatar" />
                    <span v-else class="avatar" :style="avatarStyle(r.userId)">{{ initials(r.name) }}</span>
                    <div class="min-w-0">
                      <p class="u-name">
                        {{ r.name || "—" }}
                        <span v-if="r.isPremium" class="chip c-purple">Premium</span>
                      </p>
                      <p class="u-sub">{{ r.phone || r.email || `ID ${r.userId}` }}</p>
                    </div>
                  </div>
                </td>
                <td class="num strong">{{ formatNumber(r.invited) }}</td>
                <td class="num">{{ r.activated }}</td>
                <td class="num hide-sm">{{ r.paid || "—" }}</td>
                <td class="num hide-sm nowrap">{{ r.revenue ? formatSom(r.revenue) : "—" }}</td>
                <td class="num hide-sm faint nowrap">{{ relativeTime(r.lastInviteAt) }}</td>
              </tr>
              <tr v-if="!referrers.length && !rLoading">
                <td colspan="7" class="empty">Ma'lumot yo'q</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="rTotal > rSize" class="pager">
          <ElPagination
            background
            :small="isMobile"
            :pager-count="isMobile ? 5 : 7"
            layout="prev, pager, next"
            :total="rTotal"
            :page-size="rSize"
            :current-page="rPage"
            @current-change="(p: number) => { rPage = p; loadReferrers(); }"
          />
        </div>
      </template>

      <template v-else>
        <div class="box-head">
          <div class="tools">
            <ElSelect v-model="status" class="sel">
              <ElOption v-for="o in STATUS_FILTERS" :key="o.value" :label="o.label" :value="o.value" />
            </ElSelect>
            <ElInput v-model="lSearch" clearable placeholder="Ism, telefon, ID yoki kod" class="search" />
            <ElButton plain class="hide-sm" :disabled="!rows.length" @click="exportCsv">CSV</ElButton>
          </div>
        </div>
        <div class="tbl-wrap" v-loading="lLoading">
          <table class="tbl">
            <thead>
              <tr>
                <th>Do'st</th>
                <th class="hide-sm">Taklif qilgan</th>
                <th>Holat</th>
                <th class="num hide-sm">To'lov</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id">
                <td>
                  <div class="user">
                    <img v-if="r.referredPhoto" :src="makeFileUrl(r.referredPhoto)" class="avatar" />
                    <span v-else class="avatar" :style="avatarStyle(r.referredUserId)">{{ initials(r.referredName) }}</span>
                    <div class="min-w-0">
                      <p class="u-name">{{ r.referredName || "—" }}</p>
                      <p class="u-sub">
                        {{ formatDateTime(r.createdAt) }}
                        <button class="show-sm link" @click="openReferrer(r.referrerId)">← {{ r.referrerName || `ID ${r.referrerId}` }}</button>
                      </p>
                    </div>
                  </div>
                </td>
                <td class="hide-sm">
                  <button class="link" @click="openReferrer(r.referrerId)">{{ r.referrerName || `ID ${r.referrerId}` }}</button>
                </td>
                <td><span class="chip" :class="STATUS_META[r.status]?.cls">{{ STATUS_META[r.status]?.label ?? r.status }}</span></td>
                <td class="num hide-sm nowrap">{{ r.orders ? formatSom(r.revenue) : "—" }}</td>
              </tr>
              <tr v-if="!rows.length && !lLoading">
                <td colspan="4" class="empty">Taklif topilmadi</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="lTotal > lSize" class="pager">
          <ElPagination
            background
            :small="isMobile"
            :pager-count="isMobile ? 5 : 7"
            layout="prev, pager, next"
            :total="lTotal"
            :page-size="lSize"
            :current-page="lPage"
            @current-change="(p: number) => { lPage = p; loadReferrals(); }"
          />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped src="../coins/admin.css"></style>
<style scoped>
.kpi-value.money { font-size: 18px; }
.overview { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 12px; }
.funnel { display: flex; flex-direction: column; gap: 12px; justify-content: center; height: 100%; }
.f-row { display: grid; grid-template-columns: 78px minmax(0, 1fr) 48px 36px; align-items: center; gap: 8px; font-size: 12.5px; }
.f-label { color: var(--text-muted); font-weight: 600; }
.f-track { height: 10px; border-radius: 5px; background: var(--surface-2); overflow: hidden; }
.f-bar { height: 100%; border-radius: 5px; }
.f-value { text-align: right; font-weight: 800; color: var(--text); }
.f-conv { text-align: right; color: var(--text-faint); font-size: 11.5px; }
.chart-box { height: 200px; }
.tabs { display: flex; gap: 2px; padding: 6px 10px 0; border-bottom: 1px solid var(--border); }
.tab { padding: 9px 12px; font-size: 13.5px; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
.tab.active { color: var(--brand-strong); border-color: var(--brand-strong); }
.count { margin-left: 4px; padding: 0 6px; border-radius: 999px; font-size: 11px; background: var(--surface-2); color: var(--text-faint); }
.sel { width: 150px; }
.link { color: var(--brand-strong); font-weight: 600; }
.u-sub .link { margin-left: 4px; }
.st-joined { color: var(--info); background: var(--info-soft); }
.st-active { color: var(--success); background: var(--success-soft); }
.st-paid { color: var(--warning); background: var(--warning-soft); }
@media (max-width: 900px) {
  .overview { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .kpi-value.money { font-size: 15px; }
  .sel { width: 100%; }
  .tab { flex: 1; text-align: center; padding: 9px 6px; }
}
</style>
