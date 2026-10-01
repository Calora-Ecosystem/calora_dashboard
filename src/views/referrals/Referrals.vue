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
import { ElButton, ElInput, ElPagination } from "element-plus";
import { useReferralStore } from "../../stores/referralStore";
import { useThemeStore } from "../../stores/themeStore";
import { makeFileUrl } from "../../integrations/axios";
import type {
  ReferralRowDto,
  ReferralStatus,
  ReferralSummaryDto,
  ReferrerRowDto,
  ReferrerSort,
} from "../../@types/referral";
import PeriodFilter from "../coins/PeriodFilter.vue";
import {
  MEDAL_COLORS,
  avatarHue,
  formatDateTime,
  formatDay,
  formatDayYear,
  formatDecimal,
  formatNumber,
  formatPercent,
  formatSom,
  initials,
  periodFromQuery,
  periodLabel,
  periodToQuery,
  relativeTime,
  resolvePeriod,
  type PeriodState,
} from "../coins/coinMeta";
import { SORTS, STATUS_FILTERS, STATUS_META, formatDuration } from "./referralMeta";

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
const referralStore = useReferralStore();
const themeStore = useThemeStore();

const period = ref<PeriodState>(periodFromQuery(route.query));
const apiPeriod = computed(() => resolvePeriod(period.value));
const tab = ref<"referrers" | "referrals">(route.query.tab === "referrals" ? "referrals" : "referrers");

const summary = ref<ReferralSummaryDto | null>(null);
const loadingSummary = ref(false);

const loadSummary = async () => {
  loadingSummary.value = true;
  try {
    summary.value = await referralStore.getSummary(apiPeriod.value);
  } finally {
    loadingSummary.value = false;
  }
};

const syncQuery = () =>
  router.replace({
    query: { ...periodToQuery(period.value), ...(tab.value === "referrals" ? { tab: "referrals" } : {}) },
  });

const s = computed(() => summary.value);
const periodText = computed(() => (s.value ? periodLabel(s.value.from, s.value.to) : ""));

// ── Voronka ─────────────────────────────────────────────────────────
const funnel = computed(() => {
  const x = s.value;
  if (!x) return [];
  const steps = [
    { label: "Kod ulashildi", hint: `${formatNumber(x.sharers)} user ulashdi`, value: x.codesCreated, color: "#98a2b3" },
    { label: "Do'st kod kiritdi", hint: "ro'yxatdan o'tib kodni tasdiqladi", value: x.invited, color: "#2e90fa" },
    { label: "Faol bo'ldi", hint: "onboarding'ni tugatdi", value: x.activated, color: "#7cc243" },
    { label: "To'lov qildi", hint: "Premium sotib oldi", value: x.paid, color: "#f79009" },
  ];
  const max = Math.max(...steps.map((st) => st.value), 1);
  return steps.map((st, i) => ({
    ...st,
    width: Math.max((st.value / max) * 100, st.value ? 4 : 0),
    conv: i > 0 && steps[i - 1].value > 0 ? st.value / steps[i - 1].value : null,
  }));
});

// ── Grafik ──────────────────────────────────────────────────────────
const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
      { type: "bar" as const, label: "Kod kiritdi", data: days.map((x) => x.invited), backgroundColor: "#2e90fa", borderRadius: 4, maxBarThickness: 20, order: 2 },
      { type: "bar" as const, label: "Faol bo'ldi", data: days.map((x) => x.activated), backgroundColor: "#7cc243", borderRadius: 4, maxBarThickness: 20, order: 2 },
      { type: "bar" as const, label: "Birinchi to'lov", data: days.map((x) => x.firstPayments), backgroundColor: "#f79009", borderRadius: 4, maxBarThickness: 20, order: 2 },
      {
        type: "line" as const,
        label: "Ulashishlar",
        data: days.map((x) => x.codes),
        borderColor: "#98a2b3",
        backgroundColor: "#98a2b3",
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.3,
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
    legend: {
      position: "top" as const,
      align: "end" as const,
      labels: { color: tickColor.value, boxWidth: 10, boxHeight: 10, usePointStyle: true },
    },
    tooltip: {
      callbacks: {
        title: (items: any[]) => {
          const day = s.value?.days[items[0]?.dataIndex ?? 0];
          return day ? formatDayYear(day.date) : "";
        },
        footer: (items: any[]) => {
          const day = s.value?.days[items[0]?.dataIndex ?? 0];
          return day?.premiumGrants ? `Premium berildi: ${day.premiumGrants}` : "";
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: tickColor.value, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 8 } },
    y: { beginAtZero: true, grid: { color: gridColor.value }, ticks: { color: tickColor.value, font: { size: 11 }, precision: 0 } },
  },
}));

// ── Taklif qiluvchilar reytingi ─────────────────────────────────────
const sort = ref<ReferrerSort>("invited");
const rSearch = ref("");
const rPage = ref(1);
const rSize = ref(20);
const referrers = ref<ReferrerRowDto[]>([]);
const rTotal = ref(0);
const rLoading = ref(false);

const loadReferrers = async () => {
  rLoading.value = true;
  try {
    const res = await referralStore.getReferrers(
      apiPeriod.value,
      (rPage.value - 1) * rSize.value,
      rSize.value,
      sort.value,
      rSearch.value,
    );
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

// ── Barcha takliflar ────────────────────────────────────────────────
const status = ref<ReferralStatus | "">("");
const lSearch = ref("");
const lPage = ref(1);
const lSize = ref(20);
const rows = ref<ReferralRowDto[]>([]);
const lTotal = ref(0);
const lLoading = ref(false);

const loadReferrals = async () => {
  lLoading.value = true;
  try {
    const res = await referralStore.getReferrals({
      period: apiPeriod.value,
      skip: (lPage.value - 1) * lSize.value,
      take: lSize.value,
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

const openReferrer = (userId: number) =>
  router.push({ name: "referrer_detail", params: { userId } });

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

const goal = computed(() => s.value?.program.friendsGoal ?? 5);

// ── CSV ─────────────────────────────────────────────────────────────
const downloadCsv = (name: string, header: string[], lines: unknown[][]) => {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [header.map(esc).join(","), ...lines.map((l) => l.map(esc).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const p = apiPeriod.value;
  a.href = url;
  a.download = `${name}_${p.from ?? "boshidan"}_${p.to ?? "bugungacha"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportReferrers = () =>
  downloadCsv(
    "referral-reyting",
    ["O'rin", "User ID", "Ism", "Email", "Telefon", "Taklif qildi", "Faol", "Kutilmoqda", "To'lov qildi", "Tushum (so'm)", "Ulashishlar", "Umr bo'yi faol", "Premium olgan", "Oxirgi taklif"],
    referrers.value.map((r) => [
      r.rank, r.userId, r.name, r.email, r.phone, r.invited, r.activated, r.pending, r.paid, Math.round(r.revenue),
      r.codesCreated, r.totalActivated, r.premiumGrants, formatDateTime(r.lastInviteAt),
    ]),
  );

const exportReferrals = () =>
  downloadCsv(
    "referral-takliflar",
    ["Sana", "Taklif qiluvchi ID", "Taklif qiluvchi", "Kontakt", "Do'st ID", "Do'st", "Do'st kontakti", "Kod", "Holat", "Faol bo'ldi", "Birinchi to'lov", "Tushum (so'm)"],
    rows.value.map((r) => [
      formatDateTime(r.createdAt), r.referrerId, r.referrerName, r.referrerContact, r.referredUserId, r.referredName,
      r.referredContact, r.code, STATUS_META[r.status]?.label ?? r.status,
      r.activatedAt ? formatDateTime(r.activatedAt) : "", r.firstPaymentAt ? formatDateTime(r.firstPaymentAt) : "", Math.round(r.revenue),
    ]),
  );
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">
          <svg-icon icon="navbar/gift.svg" class="title-icon" />
          Do'st taklifi (referral)
        </h1>
        <p class="page-sub">Kim kimni taklif qildi, voronka, tushum va eng faol taklif qiluvchilar — mobile "Invite friends" bo'limi</p>
      </div>
      <PeriodFilter v-model="period" />
    </header>

    <p v-if="periodText" class="period-note">
      <b>{{ periodText }}</b>
      <span>· Shu davrda kod kiritgan do'stlar va ularning keyingi natijasi (faol bo'lishi, to'lovi)</span>
    </p>

    <!-- Dastur qoidalari -->
    <section v-if="s" class="program">
      <span class="program-title">Dastur qoidalari</span>
      <span class="pill">Har <b>{{ s.program.friendsGoal }}</b> faol do'st → <b>{{ s.program.premiumDays }} kun</b> Premium</span>
      <span class="pill" v-if="s.program.discountPercent">Do'stga birinchi xaridda <b>{{ s.program.discountPercent }}%</b> chegirma</span>
      <span class="pill" v-if="s.program.referrerReward || s.program.referredReward">
        Coin: taklif qiluvchiga <b>{{ s.program.referrerReward }}</b>, do'stga <b>{{ s.program.referredReward }}</b>
      </span>
      <span class="pill">Umr bo'yi: <b>{{ formatNumber(s.totalInvited) }}</b> do'st, <b>{{ formatNumber(s.totalReferrers) }}</b> taklif qiluvchi, <b>{{ formatNumber(s.totalPremiumGrants) }}</b> premium</span>
    </section>

    <!-- KPI -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4" v-loading="loadingSummary && !s">
      <div class="app-card kpi">
        <span class="kpi-label">Taklif qilingan do'stlar</span>
        <span class="kpi-value">{{ formatNumber(s?.invited) }}</span>
        <span class="kpi-sub">{{ formatNumber(s?.referrers) }} taklif qiluvchi · o'rtacha {{ formatDecimal(s?.avgInvitesPerReferrer, 2) }}</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Faol bo'ldi</span>
        <span class="kpi-value">{{ formatNumber(s?.activated) }} <small>{{ formatPercent(s?.activationRate) }}</small></span>
        <span class="kpi-sub">{{ formatNumber(s?.pending) }} kutilmoqda · o'rtacha {{ formatDuration(s?.avgHoursToActivate) }}da</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">To'lov qildi</span>
        <span class="kpi-value">{{ formatNumber(s?.paid) }} <small>{{ formatPercent(s?.paidRate) }}</small></span>
        <span class="kpi-sub">
          <template v-if="s?.avgDaysToFirstPayment !== null && s?.avgDaysToFirstPayment !== undefined">birinchi to'lovgacha ~{{ formatDecimal(s.avgDaysToFirstPayment) }} kun</template>
          <template v-else>hali to'lov yo'q</template>
        </span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Referral tushumi</span>
        <span class="kpi-value money">{{ formatSom(s?.revenue) }}</span>
        <span class="kpi-sub">{{ formatNumber(s?.orders) }} ta to'lov · {{ formatSom(s?.revenuePerPaid) }} / do'st</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Yangi userlardagi ulushi</span>
        <span class="kpi-value">{{ formatPercent(s?.referralShareOfNewUsers) }}</span>
        <span class="kpi-sub">{{ formatNumber(s?.newUsersReferred) }} / {{ formatNumber(s?.newUsers) }} yangi user referral orqali</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Ulashishlar</span>
        <span class="kpi-value">{{ formatNumber(s?.codesCreated) }}</span>
        <span class="kpi-sub">{{ formatNumber(s?.sharers) }} user · kod → do'st {{ formatPercent(s?.codeConversion) }}</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Berilgan Premium</span>
        <span class="kpi-value">{{ formatNumber(s?.premiumGrants) }} <small>{{ formatNumber(s?.premiumDaysGranted) }} kun</small></span>
        <span class="kpi-sub">har {{ goal }} faol do'st uchun<template v-if="s?.coinsRewarded"> · {{ formatNumber(s.coinsRewarded) }} coin</template></span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Chegirmalar</span>
        <span class="kpi-value">{{ formatNumber(s?.discountsUsed) }}</span>
        <span class="kpi-sub">{{ formatSom(s?.discountGiven) }} chegirma berildi</span>
      </div>
    </div>

    <div v-if="s && s.nearMilestone > 0" class="hint-card">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      <span>
        <b>{{ formatNumber(s.nearMilestone) }}</b> ta userga Premium uchun <b>1 ta</b> faol do'st qolgan — ularga eslatma push yuborish yaxshi samara beradi.
      </span>
      <router-link :to="{ name: 'push_campaigns' }" class="link">Push yuborish →</router-link>
    </div>

    <!-- Voronka + grafik -->
    <div class="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4">
      <section class="app-card funnel-card">
        <h2 class="section-title">Voronka</h2>
        <p class="section-sub">Ulashishdan to'lovgacha</p>
        <div class="funnel">
          <div v-for="f in funnel" :key="f.label" class="f-step">
            <div class="f-head">
              <span class="f-label">{{ f.label }}</span>
              <span class="f-value">{{ formatNumber(f.value) }}</span>
            </div>
            <div class="f-track"><div class="f-bar" :style="{ width: f.width + '%', background: f.color }" /></div>
            <div class="f-foot">
              <span>{{ f.hint }}</span>
              <span v-if="f.conv !== null" class="f-conv">{{ formatPercent(f.conv) }} oldingidan</span>
            </div>
          </div>
        </div>
      </section>

      <section class="app-card chart-card">
        <h2 class="section-title">Kunma-kun</h2>
        <p class="section-sub">Kod kiritish, faollashish va birinchi to'lovlar (kod kiritilgandan keyin)</p>
        <div class="chart-box">
          <Bar :data="chartData as any" :options="chartOptions" />
        </div>
      </section>
    </div>

    <!-- Jadval -->
    <section class="app-card table-card">
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'referrers' }" @click="tab = 'referrers'">
          Taklif qiluvchilar <span class="count">{{ formatNumber(rTotal) }}</span>
        </button>
        <button class="tab" :class="{ active: tab === 'referrals' }" @click="tab = 'referrals'">
          Barcha takliflar <span class="count">{{ formatNumber(lTotal) }}</span>
        </button>
      </div>

      <!-- Reyting -->
      <template v-if="tab === 'referrers'">
        <div class="table-toolbar">
          <div class="seg">
            <button v-for="o in SORTS" :key="o.value" class="seg-btn" :class="{ 'seg-active': sort === o.value }" @click="sort = o.value">
              {{ o.label }}
            </button>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <ElInput v-model="rSearch" clearable placeholder="Ism, email, telefon yoki ID" class="search" />
            <ElButton plain :disabled="!referrers.length" @click="exportReferrers">CSV</ElButton>
          </div>
        </div>
        <div class="table-wrap" v-loading="rLoading">
          <table class="lb">
            <thead>
              <tr>
                <th class="rank-col">O'rin</th>
                <th>Taklif qiluvchi</th>
                <th class="num">Taklif qildi</th>
                <th>Faol</th>
                <th class="num">To'lov qildi</th>
                <th class="num">Tushum</th>
                <th class="num">Ulashdi</th>
                <th>Premium</th>
                <th class="num">Oxirgi taklif</th>
                <th class="chev-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in referrers" :key="r.userId" @click="openReferrer(r.userId)">
                <td class="rank-col">
                  <span
                    v-if="r.rank <= 3"
                    class="medal"
                    :style="{ background: MEDAL_COLORS[r.rank - 1] + '26', color: MEDAL_COLORS[r.rank - 1] }"
                  >{{ r.rank }}</span>
                  <span v-else class="rank-num">{{ r.rank }}</span>
                </td>
                <td>
                  <div class="user-cell">
                    <img v-if="r.photo" :src="makeFileUrl(r.photo)" class="avatar" />
                    <span v-else class="avatar" :style="avatarStyle(r.userId)">{{ initials(r.name) }}</span>
                    <div class="min-w-0">
                      <p class="user-name">
                        {{ r.name || "—" }}
                        <span v-if="r.isPremium" class="tag tag-premium">Premium</span>
                        <span v-if="r.isDeleted" class="tag tag-deleted">o'chirilgan</span>
                      </p>
                      <p class="user-sub">ID {{ r.userId }}<span v-if="r.phone || r.email"> · {{ r.phone || r.email }}</span></p>
                    </div>
                  </div>
                </td>
                <td class="num"><b class="big">{{ formatNumber(r.invited) }}</b></td>
                <td>
                  <div class="act-cell">
                    <span><b>{{ r.activated }}</b><span class="faint"> / {{ r.invited }}</span></span>
                    <div class="mini-track"><div class="mini-fill" :style="{ width: (r.activationRate * 100) + '%' }" /></div>
                  </div>
                </td>
                <td class="num">
                  <b v-if="r.paid" class="paid">{{ r.paid }}</b>
                  <span v-else class="faint">—</span>
                </td>
                <td class="num nowrap">{{ r.revenue ? formatSom(r.revenue) : "—" }}</td>
                <td class="num muted">{{ formatNumber(r.codesCreated) }}</td>
                <td>
                  <div class="prem-cell">
                    <span v-if="r.premiumGrants" class="tag tag-grant">{{ r.premiumGrants }}× · {{ r.premiumDays }} kun</span>
                    <span class="faint">yana {{ r.friendsLeft }} ta → {{ goal }}</span>
                  </div>
                </td>
                <td class="num muted nowrap">{{ relativeTime(r.lastInviteAt) }}</td>
                <td class="chev-col">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </td>
              </tr>
              <tr v-if="!referrers.length && !rLoading">
                <td colspan="10" class="empty">{{ rSearch.trim() ? "Qidiruv bo'yicha topilmadi" : "Bu davrda hech kim do'st taklif qilmagan" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="rTotal > rSize" class="pager">
          <ElPagination
            background
            layout="sizes, prev, pager, next"
            :total="rTotal"
            :page-size="rSize"
            :page-sizes="[20, 50, 100]"
            :current-page="rPage"
            @current-change="(p: number) => { rPage = p; loadReferrers(); }"
            @size-change="(z: number) => { rSize = z; rPage = 1; loadReferrers(); }"
          />
        </div>
      </template>

      <!-- Barcha takliflar -->
      <template v-else>
        <div class="table-toolbar">
          <div class="seg">
            <button v-for="o in STATUS_FILTERS" :key="o.value" class="seg-btn" :class="{ 'seg-active': status === o.value }" @click="status = o.value">
              {{ o.label }}
            </button>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <ElInput v-model="lSearch" clearable placeholder="Ism, telefon, ID yoki kod" class="search" />
            <ElButton plain :disabled="!rows.length" @click="exportReferrals">CSV</ElButton>
          </div>
        </div>
        <div class="table-wrap" v-loading="lLoading">
          <table class="lb">
            <thead>
              <tr>
                <th>Kod kiritildi</th>
                <th>Taklif qiluvchi</th>
                <th></th>
                <th>Do'st</th>
                <th>Holat</th>
                <th class="num">Faol bo'ldi</th>
                <th class="num">To'lov</th>
                <th>Kod</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id" class="plain">
                <td class="nowrap muted">{{ formatDateTime(r.createdAt) }}</td>
                <td>
                  <button class="person" @click="openReferrer(r.referrerId)">
                    <span class="p-name">{{ r.referrerName || "—" }}</span>
                    <span class="p-sub">ID {{ r.referrerId }}<template v-if="r.referrerContact"> · {{ r.referrerContact }}</template></span>
                  </button>
                </td>
                <td class="arrow-col">→</td>
                <td>
                  <div class="user-cell">
                    <img v-if="r.referredPhoto" :src="makeFileUrl(r.referredPhoto)" class="avatar sm" />
                    <span v-else class="avatar sm" :style="avatarStyle(r.referredUserId)">{{ initials(r.referredName) }}</span>
                    <div class="min-w-0">
                      <p class="user-name">
                        {{ r.referredName || "—" }}
                        <span v-if="r.isPremium" class="tag tag-premium">Premium</span>
                        <span v-if="r.referredDeleted" class="tag tag-deleted">o'chirilgan</span>
                      </p>
                      <p class="user-sub">
                        ID {{ r.referredUserId }}<template v-if="r.referredContact"> · {{ r.referredContact }}</template>
                        <template v-if="r.daysAfterSignup"> · ro'yxatdan {{ r.daysAfterSignup }} kun keyin</template>
                      </p>
                    </div>
                  </div>
                </td>
                <td><span class="status" :class="STATUS_META[r.status]?.cls" :title="STATUS_META[r.status]?.hint">{{ STATUS_META[r.status]?.label ?? r.status }}</span></td>
                <td class="num muted nowrap">{{ r.activatedAt ? formatDateTime(r.activatedAt) : "—" }}</td>
                <td class="num nowrap">
                  <template v-if="r.orders">
                    <b>{{ formatSom(r.revenue) }}</b>
                    <span class="p-sub block">{{ r.orders }} ta · {{ formatDayYear(r.firstPaymentAt!) }}</span>
                  </template>
                  <span v-else class="faint">—</span>
                </td>
                <td class="mono">{{ r.code || "—" }}</td>
              </tr>
              <tr v-if="!rows.length && !lLoading">
                <td colspan="8" class="empty">Taklif topilmadi</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="lTotal > lSize" class="pager">
          <ElPagination
            background
            layout="sizes, prev, pager, next"
            :total="lTotal"
            :page-size="lSize"
            :page-sizes="[20, 50, 100]"
            :current-page="lPage"
            @current-change="(p: number) => { lPage = p; loadReferrals(); }"
            @size-change="(z: number) => { lSize = z; lPage = 1; loadReferrals(); }"
          />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.title-icon { width: 24px; height: 24px; }
.title-icon :deep(svg) { stroke: var(--brand-strong); stroke-width: 2; fill: none; }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.period-note { font-size: 12.5px; color: var(--text-faint); margin-top: -6px; }
.period-note b { color: var(--text); font-weight: 700; margin-right: 4px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text); }
.section-sub { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }
.faint { color: var(--text-faint); }
.muted { color: var(--text-muted) !important; }
.nowrap { white-space: nowrap; }
.block { display: block; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.link { font-weight: 600; color: var(--brand-strong); white-space: nowrap; }

.program { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.program-title { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); margin-right: 2px; }
.pill { padding: 5px 11px; border-radius: 999px; font-size: 12.5px; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); }
.pill b { color: var(--text); }

.kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kpi-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); }
.kpi-value { font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi-value small { font-size: 13px; font-weight: 700; color: var(--brand-strong); letter-spacing: 0; margin-left: 2px; }
.kpi-value.money { font-size: 22px; }
.kpi-sub { font-size: 12px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.hint-card { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 16px; border-radius: 14px; font-size: 13px; color: var(--text); background: var(--warning-soft); border: 1px solid rgba(247, 144, 9, 0.3); }
.hint-card svg { width: 18px; height: 18px; color: var(--warning); flex-shrink: 0; }
.hint-card span { flex: 1; min-width: 200px; }

.funnel-card, .chart-card { padding: 18px 20px; }
.funnel { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
.f-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.f-label { font-size: 13px; font-weight: 600; color: var(--text); }
.f-value { font-size: 18px; font-weight: 800; color: var(--text); }
.f-track { height: 10px; border-radius: 6px; background: var(--surface-2); overflow: hidden; margin-top: 6px; }
.f-bar { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
.f-foot { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--text-faint); margin-top: 4px; }
.f-conv { font-weight: 700; color: var(--text-muted); white-space: nowrap; }
.chart-box { height: 280px; margin-top: 12px; }

.table-card { padding: 0; overflow: hidden; }
.tabs { display: flex; gap: 4px; padding: 10px 12px 0; border-bottom: 1px solid var(--border); }
.tab { padding: 10px 14px; font-size: 13.5px; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: var(--brand-strong); border-color: var(--brand-strong); }
.count { margin-left: 4px; padding: 1px 7px; border-radius: 999px; font-size: 11.5px; background: var(--surface-2); color: var(--text-faint); }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 14px 16px; }
.search { width: 260px; }
.seg { display: inline-flex; flex-wrap: wrap; padding: 4px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--border); gap: 3px; }
.seg-btn { padding: 6px 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
.seg-btn:hover { color: var(--text); }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }

.table-wrap { overflow-x: auto; }
.lb { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 980px; }
.lb th { text-align: left; padding: 12px 14px; font-size: 11.5px; font-weight: 600; white-space: nowrap; color: var(--text-faint); background: var(--surface-2); text-transform: uppercase; letter-spacing: 0.3px; }
.lb td { padding: 10px 14px; border-top: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.lb tbody tr { cursor: pointer; transition: background 0.12s ease; }
.lb tbody tr.plain { cursor: default; }
.lb tbody tr:hover { background: var(--surface-2); }
.lb .num, .lb th.num { text-align: right; }
.rank-col { width: 64px; text-align: center !important; }
.chev-col { width: 36px; color: var(--text-faint); }
.chev-col svg { width: 16px; height: 16px; }
.arrow-col { width: 20px; padding-left: 0 !important; padding-right: 0 !important; color: var(--text-faint); text-align: center; }
.medal { width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; }
.rank-num { font-size: 14px; font-weight: 700; color: var(--text-faint); }
.user-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; object-fit: cover; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12.5px; }
.avatar.sm { width: 30px; height: 30px; font-size: 11.5px; }
.user-name { font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
.user-sub { font-size: 12px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
.big { font-size: 15px; font-weight: 800; }
.paid { color: var(--warning); }
.act-cell { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
.mini-track { height: 5px; border-radius: 4px; background: var(--surface-2); overflow: hidden; }
.mini-fill { height: 100%; background: var(--brand); border-radius: 4px; }
.prem-cell { display: flex; flex-direction: column; gap: 3px; font-size: 12px; white-space: nowrap; }
.tag { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700; vertical-align: middle; }
.prem-cell .tag { margin-left: 0; align-self: flex-start; }
.tag-premium { color: var(--purple); background: var(--purple-soft); }
.tag-deleted { color: var(--danger); background: var(--danger-soft); }
.tag-grant { color: var(--brand-strong); background: var(--brand-soft); }
.person { display: flex; flex-direction: column; text-align: left; min-width: 0; }
.person:hover .p-name { color: var(--brand-strong); text-decoration: underline; }
.p-name { font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
.p-sub { font-size: 12px; color: var(--text-faint); white-space: nowrap; }
.status { padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.st-joined { color: var(--info); background: var(--info-soft); }
.st-active { color: var(--success); background: var(--success-soft); }
.st-paid { color: var(--warning); background: var(--warning-soft); }
.empty { text-align: center; color: var(--text-faint); padding: 30px; cursor: default; }
.pager { display: flex; justify-content: flex-end; padding: 14px 16px; border-top: 1px solid var(--border); }

@media (max-width: 700px) {
  .page-title { font-size: 19px; }
  .search { width: 100%; }
  .kpi-value { font-size: 22px; }
}
</style>
