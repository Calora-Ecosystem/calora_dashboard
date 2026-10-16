<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Filler,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";
import { ElInput, ElOption, ElSelect } from "element-plus";
import Card from "../../components/ui/Card.vue";
import UserDetailDrawer from "../../components/ui/UserDetailDrawer.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useThemeStore } from "../../stores/themeStore";
import { formatDate, formatMoney } from "../../utils/FormatHelper";
import {
  RENEWAL_GRACE_DAYS,
  buildCohorts,
  buildCurve,
  buildLtvUsers,
  isStoreProvider,
  monthIndex,
  planKey,
  planLabel,
  renewalStats,
  type CohortRow,
  type LtvUser,
  type RenewalStatus,
  type SubscriptionOrderDto,
} from "../../utils/LtvHelper";

ChartJS.register(
  Tooltip, Legend, BarElement, BarController, LineElement, LineController,
  PointElement, Filler, CategoryScale, LinearScale,
);

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();

const orders = ref<SubscriptionOrderDto[]>([]);
const loading = ref(true);

const load = async () => {
  loading.value = true;
  try {
    orders.value = (await dashboardStore.loadAllSubscriptionOrders()) ?? [];
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const allUsers = computed(() => buildLtvUsers(orders.value));

/* ---------------- Filtrlar ---------------- */
const range = ref<"6" | "12" | "all">("12");
const ranges = [
  { key: "6", label: "6 oy" },
  { key: "12", label: "12 oy" },
  { key: "all", label: "Hammasi" },
] as const;
const planFilter = ref<"" | "Premium" | "Family">("");
const providerFilter = ref<"" | "direct" | "store">("");

const users = computed(() => {
  const current = monthIndex(new Date());
  return allUsers.value.filter((u) => {
    if (range.value !== "all" && u.cohort < current - (Number(range.value) - 1)) return false;
    if (planFilter.value && u.first.plan !== planFilter.value) return false;
    if (providerFilter.value && (providerFilter.value === "store") !== isStoreProvider(u.first.provider)) return false;
    return true;
  });
});

/* ---------------- KPI ---------------- */
const pct = (v: number) => `${Math.round(v)}%`;

const totals = computed(() => {
  const list = users.value;
  const now = new Date();
  const revenue = list.reduce((s, u) => s + u.totalPaid, 0);
  const repeat = list.filter((u) => u.payments.length > 1).length;
  const months = list.reduce((s, u) => s + u.coveredMonths, 0);
  const payments = list.reduce((s, u) => s + u.payments.length, 0);
  const activeNow = list.filter((u) => u.paidUntil > now).length;
  return {
    payers: list.length,
    revenue,
    avgLtv: list.length ? revenue / list.length : 0,
    repeat,
    repeatPct: list.length ? (repeat / list.length) * 100 : 0,
    avgMonths: list.length ? months / list.length : 0,
    avgPayments: list.length ? payments / list.length : 0,
    activeNow,
  };
});

const monthlyStats = computed(() => renewalStats(users.value.filter((u) => u.first.months === 1)));
const allStats = computed(() => renewalStats(users.value));

const kpis = computed(() => {
  const t = totals.value;
  const m = monthlyStats.value;
  return [
    {
      label: "O'rtacha LTV",
      value: formatMoney(t.avgLtv),
      sub: `${t.payers} ta to'lovchi · jami ${formatMoney(t.revenue)}`,
      hint: "Bitta to'lovchi user shu paytgacha keltirgan o'rtacha tushum",
      glyph: "money",
      tone: "brand",
    },
    {
      label: "Keyingi oyga to'lov",
      value: m.decided ? pct(m.rate) : "—",
      sub: m.decided
        ? `${m.renewed} / ${m.decided} ta oylik obunachi qayta to'ladi${m.pending ? ` · ${m.pending} tasi kutilmoqda` : ""}`
        : m.pending
          ? `${m.pending} ta oylik obunachining muddati hali tugamagan`
          : "Oylik obuna sotuvlari yo'q",
      hint: `Oylik tarif olganlardan necha foizi oy tugagach (${RENEWAL_GRACE_DAYS} kun ichida) yana to'ladi`,
      glyph: "repeat",
      tone: "info",
    },
    {
      label: "Qayta xarid qilganlar",
      value: t.payers ? pct(t.repeatPct) : "—",
      sub: `${t.repeat} ta user 2 va undan ko'p marta to'lagan`,
      hint: "Kamida ikki marta pul to'lagan userlar ulushi (har qanday tarif)",
      glyph: "users",
      tone: "purple",
    },
    {
      label: "O'rtacha obuna umri",
      value: `${t.avgMonths.toFixed(1)} oy`,
      sub: `o'rtacha ${t.avgPayments.toFixed(1)} ta to'lov · hozir faol: ${t.activeNow}`,
      hint: "Bitta user jami necha oylik obuna uchun to'lagan",
      glyph: "clock",
      tone: "warning",
    },
  ];
});

const toneVars: Record<string, { bg: string; fg: string }> = {
  brand: { bg: "var(--brand-soft)", fg: "var(--brand-strong)" },
  info: { bg: "var(--info-soft)", fg: "var(--info)" },
  purple: { bg: "var(--purple-soft)", fg: "var(--purple)" },
  warning: { bg: "var(--warning-soft)", fg: "var(--warning)" },
};

/* ---------------- Holatlar ---------------- */
const statusMeta: Record<RenewalStatus, { label: string; fg: string; soft: string; hex: string; hint: string }> = {
  renewed: { label: "Qayta to'ladi", fg: "var(--success)", soft: "var(--success-soft)", hex: "#12b76a", hint: `Muddati tugaguncha yoki ${RENEWAL_GRACE_DAYS} kun ichida yana to'ladi` },
  late: { label: "Kech qaytdi", fg: "var(--info)", soft: "var(--info-soft)", hex: "#2e90fa", hint: "Obunasi tugab, keyinroq qaytib to'ladi" },
  churned: { label: "Qaytmadi", fg: "var(--danger)", soft: "var(--danger-soft)", hex: "#f04438", hint: "Muddat tugadi, qayta to'lov bo'lmadi" },
  pending: { label: "Muddati tugamagan", fg: "var(--warning)", soft: "var(--warning-soft)", hex: "#f79009", hint: "Birinchi obuna davri hali davom etmoqda" },
  unknown: { label: "Store (avto)", fg: "var(--purple)", soft: "var(--purple-soft)", hex: "#7a5af8", hint: "App Store / Google Play avto-yangilanishi buyurtmalarda ko'rinmaydi" },
};
const statusOrder: RenewalStatus[] = ["renewed", "late", "churned", "pending", "unknown"];

const statusRows = computed(() => {
  const s = allStats.value;
  const total = users.value.length || 1;
  return statusOrder.map((key) => ({ key, count: s[key], pct: (s[key] / total) * 100, ...statusMeta[key] }));
});

const storeUsers = computed(() => users.value.filter((u) => isStoreProvider(u.first.provider)).length);

/* ---------------- LTV egri chizig'i ---------------- */
const cohorts = computed(() => buildCohorts(users.value));
const curve = computed(() => buildCurve(cohorts.value));

const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const monthName = (k: number) => (k === 0 ? "Xarid" : `${k}-oy`);

const curveChartData = computed(() => ({
  labels: curve.value.map((p) => monthName(p.k)),
  datasets: [
    {
      type: "line",
      label: "O'rtacha LTV",
      data: curve.value.map((p) => p.ltv),
      yAxisID: "y",
      borderColor: "#7cc243",
      backgroundColor: "rgba(124, 194, 67, 0.14)",
      fill: true,
      tension: 0.35,
      pointRadius: 3.5,
      pointBackgroundColor: "#7cc243",
      borderWidth: 2.5,
      order: 1,
    },
    {
      type: "bar",
      label: "Shu oyda to'laganlar",
      data: curve.value.map((p) => p.paidPct),
      yAxisID: "y1",
      backgroundColor: "rgba(46, 144, 250, 0.28)",
      hoverBackgroundColor: "rgba(46, 144, 250, 0.45)",
      borderRadius: 6,
      maxBarThickness: 30,
      order: 2,
    },
  ],
})) as any;

const curveChartOptions = computed(() => {
  themeStore.mode; // reactive dep
  const tick = { color: cssVar("--text-faint"), font: { size: 11 } };
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: themeStore.mode === "dark" ? "#1a212e" : "#1a202c",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (c: any) =>
            c.dataset.yAxisID === "y"
              ? ` O'rtacha LTV: ${formatMoney(c.parsed.y, "standard")}`
              : ` To'laganlar: ${Math.round(c.parsed.y)}%`,
          footer: (items: any[]) => {
            const p = curve.value[items[0]?.dataIndex];
            return p?.cohorts ? `${p.cohorts} ta kohort asosida` : "";
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: tick },
      y: { position: "left", beginAtZero: true, grid: { color: cssVar("--border") }, border: { display: false }, ticks: { ...tick, callback: (v: any) => formatMoney(v) } },
      y1: { position: "right", min: 0, max: 100, grid: { display: false }, border: { display: false }, ticks: { ...tick, callback: (v: any) => `${v}%` } },
    },
  };
});

const hasCurve = computed(() => curve.value.some((p) => p.ltv !== null));

/* ---------------- Kohort jadvali ---------------- */
const cohortMode = ref<"paid" | "active" | "ltv">("paid");
const cohortModes = [
  { key: "paid", label: "To'lov qilganlar" },
  { key: "active", label: "Obunasi faol" },
  { key: "ltv", label: "LTV (so'm)" },
] as const;

const maxCohortLtv = computed(() =>
  Math.max(1, ...cohorts.value.flatMap((r) => r.cumRevenue.map((v) => (v ?? 0) / r.size))),
);

const cohortCell = (row: CohortRow, k: number) => {
  const raw = cohortMode.value === "paid" ? row.paid[k] : cohortMode.value === "active" ? row.active[k] : row.cumRevenue[k];
  if (raw === null) return null;
  if (cohortMode.value === "ltv") {
    const perUser = raw / row.size;
    return { text: formatMoney(perUser), intensity: perUser / maxCohortLtv.value, title: `${formatMoney(perUser, "standard")} / user` };
  }
  const share = (raw / row.size) * 100;
  return { text: `${Math.round(share)}%`, intensity: share / 100, title: `${raw} / ${row.size} user` };
};

const cellStyle = (intensity: number) => ({
  background: `rgba(var(--brand-rgb), ${(0.06 + intensity * 0.74).toFixed(3)})`,
  color: intensity > 0.55 ? "#fff" : "var(--text)",
});

/* ---------------- Tariflar bo'yicha ---------------- */
const planRows = computed(() => {
  const groups = new Map<string, LtvUser[]>();
  for (const u of users.value) {
    const key = planKey(u.first);
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  const totalRevenue = users.value.reduce((s, u) => s + u.totalPaid, 0) || 1;
  return [...groups.entries()]
    .map(([key, list]) => {
      const revenue = list.reduce((s, u) => s + u.totalPaid, 0);
      const stats = renewalStats(list);
      return {
        key,
        label: planLabel(list[0].first.plan, list[0].first.months),
        family: list[0].first.plan === "Family",
        users: list.length,
        revenue,
        share: (revenue / totalRevenue) * 100,
        avgLtv: revenue / list.length,
        avgPayments: list.reduce((s, u) => s + u.payments.length, 0) / list.length,
        stats,
      };
    })
    .sort((a, b) => b.users - a.users);
});

/* ---------------- Userlar jadvali ---------------- */
const search = ref("");
const statusFilter = ref<RenewalStatus | "">("");
const page = ref(1);
const pageSize = 10;

const tableUsers = computed(() => {
  let rows = users.value;
  const q = search.value.trim().toLowerCase();
  if (q) rows = rows.filter((u) => (u.userName ?? "").toLowerCase().includes(q) || String(u.userId).includes(q));
  if (statusFilter.value) rows = rows.filter((u) => u.status === statusFilter.value);
  return [...rows].sort((a, b) => b.first.at.getTime() - a.first.at.getTime());
});
const pagedUsers = computed(() => tableUsers.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const totalPages = computed(() => Math.max(1, Math.ceil(tableUsers.value.length / pageSize)));
const resetPage = () => (page.value = 1);

const daysLeft = (d: Date) => Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));

const detailOpen = ref(false);
const detailUserId = ref<number | null>(null);
const openUser = (u: LtvUser) => {
  detailUserId.value = u.userId;
  detailOpen.value = true;
};

const providerLabel = (p: string) => (isStoreProvider(p) ? "Store" : p);
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <!-- Filtrlar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="inline-flex p-1 rounded-xl self-start" style="background: var(--surface); border: 1px solid var(--border)">
          <button
            v-for="r in ranges"
            :key="r.key"
            class="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
            :class="range === r.key ? 'seg-active' : 'seg-idle'"
            @click="range = r.key; resetPage()"
          >{{ r.label }}</button>
        </div>
        <span class="text-[12px]" style="color: var(--text-faint)">birinchi to'lov sanasi bo'yicha</span>
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <ElSelect v-model="planFilter" placeholder="Barcha tariflar" clearable size="large" style="width: 170px" @change="resetPage">
          <ElOption label="Premium" value="Premium" />
          <ElOption label="Oilaviy" value="Family" />
        </ElSelect>
        <ElSelect v-model="providerFilter" placeholder="Barcha to'lov usullari" clearable size="large" style="width: 210px" @change="resetPage">
          <ElOption label="Payme / Click" value="direct" />
          <ElOption label="App Store / Google Play" value="store" />
        </ElSelect>
        <button class="btn-ghost" :disabled="loading" @click="load">
          <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Yangilash
        </button>
      </div>
    </div>

    <!-- Yuklanmoqda -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="skel" />
    </div>

    <!-- Bo'sh -->
    <div v-else-if="!users.length" class="app-card py-16 flex flex-col items-center text-center">
      <svg class="w-10 h-10 mb-3" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v14a4 4 0 0 0 4 4h14"/><path d="M7 15l3.5-4 3 2.5L19 7"/></svg>
      <h3 class="text-[15px] font-semibold" style="color: var(--text)">To'lov qilgan userlar topilmadi</h3>
      <p class="text-[13px] mt-1" style="color: var(--text-faint)">Davr yoki filtrlarni o'zgartirib ko'ring</p>
    </div>

    <template v-else>
      <!-- KPI -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="k in kpis" :key="k.label" class="app-card p-5" :title="k.hint">
          <div class="flex items-start justify-between">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" :style="{ background: toneVars[k.tone].bg, color: toneVars[k.tone].fg }">
              <svg v-if="k.glyph === 'money'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <svg v-else-if="k.glyph === 'repeat'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              <svg v-else-if="k.glyph === 'users'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <p class="text-[13px] font-medium mt-4" style="color: var(--text-muted)">{{ k.label }}</p>
          <p class="text-[24px] font-bold mt-1 leading-none tracking-tight" style="color: var(--text)">{{ k.value }}</p>
          <p class="text-[12px] mt-2 leading-snug" style="color: var(--text-faint)">{{ k.sub }}</p>
        </div>
      </div>

      <!-- IAP eslatmasi -->
      <div v-if="storeUsers" class="notice">
        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <strong>{{ storeUsers }} ta user App Store / Google Play orqali to'lagan.</strong>
          Store obunasi avtomatik yangilanadi, lekin yangilanish alohida buyurtma sifatida yozilmaydi — shuning uchun
          ularning keyingi to'lovlari bu yerda ko'rinmaydi. Ular <b>"Store (avto)"</b> holatida turadi va qayta to'lov foiziga kirmaydi.
          Aniq raqam uchun "To'lov usuli → Payme / Click" filtrini tanlang.
        </div>
      </div>

      <!-- Egri chiziq + holatlar -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div class="xl:col-span-2">
          <Card title="LTV o'sishi" subtitle="Birinchi to'lovdan keyin har oy o'rtacha bitta user qancha pul keltirgan">
            <template #actions>
              <div class="flex items-center gap-4 text-[12px]" style="color: var(--text-muted)">
                <span class="flex items-center gap-1.5"><span class="legend-dot" style="background: #7cc243"></span>O'rtacha LTV</span>
                <span class="flex items-center gap-1.5"><span class="legend-dot" style="background: rgba(46, 144, 250, 0.5)"></span>Shu oyda to'laganlar</span>
              </div>
            </template>
            <div class="h-[300px]">
              <Bar v-if="hasCurve" :data="curveChartData" :options="curveChartOptions" />
              <div v-else class="h-full flex items-center justify-center text-[14px]" style="color: var(--text-faint)">Ma'lumot yetarli emas</div>
            </div>
          </Card>
        </div>

        <Card title="Keyingi to'lov natijasi" subtitle="Birinchi obuna davri tugagach nima bo'ldi">
          <div class="flex items-baseline gap-2">
            <span class="text-[30px] font-extrabold leading-none" style="color: var(--text)">{{ allStats.decided ? pct(allStats.rate) : "—" }}</span>
            <span class="text-[12.5px]" style="color: var(--text-muted)">o'z vaqtida qayta to'ladi</span>
          </div>
          <p class="text-[12px] mt-1.5" style="color: var(--text-faint)">
            Barcha tariflar · {{ allStats.decided }} ta userning birinchi davri tugagan
            <template v-if="allStats.decided"> · kech qaytganlar bilan {{ pct(allStats.returnRate) }}</template>
          </p>

          <div class="stack-bar mt-4">
            <div v-for="s in statusRows" :key="s.key" :style="{ width: s.pct + '%', background: s.hex }" :title="`${s.label}: ${s.count}`"></div>
          </div>

          <div class="mt-4 space-y-2.5">
            <div v-for="s in statusRows" :key="s.key" class="flex items-center gap-2.5" :title="s.hint">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: s.hex }"></span>
              <span class="text-[13px] flex-1" style="color: var(--text-muted)">{{ s.label }}</span>
              <span class="text-[12px]" style="color: var(--text-faint)">{{ pct(s.pct) }}</span>
              <span class="text-[13px] font-semibold w-8 text-right" style="color: var(--text)">{{ s.count }}</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Kohortlar -->
      <Card title="Oylik kohortlar" subtitle="Har qator — shu oyda birinchi marta to'lagan userlar; ustunlar — keyingi oylarda nima bo'lgani">
        <template #actions>
          <div class="inline-flex p-1 rounded-xl shrink-0" style="background: var(--surface-2); border: 1px solid var(--border)">
            <button
              v-for="m in cohortModes"
              :key="m.key"
              class="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap"
              :class="cohortMode === m.key ? 'seg-active' : 'seg-idle'"
              @click="cohortMode = m.key"
            >{{ m.label }}</button>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="cohort-table">
            <thead>
              <tr>
                <th class="text-left">Kohort</th>
                <th class="text-right">Userlar</th>
                <th class="text-right">Tushum</th>
                <th v-for="k in curve.length" :key="k">{{ monthName(k - 1) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in cohorts" :key="row.cohort">
                <td class="font-semibold whitespace-nowrap" style="color: var(--text)">{{ row.label }}</td>
                <td class="text-right" style="color: var(--text-muted)">{{ row.size }}</td>
                <td class="text-right whitespace-nowrap" style="color: var(--text-muted)">{{ formatMoney(row.revenue) }}</td>
                <td v-for="k in curve.length" :key="k" class="mcell">
                  <div
                    v-if="cohortCell(row, k - 1)"
                    class="cell"
                    :class="{ 'is-current': k - 1 === row.currentMonthOffset }"
                    :style="cellStyle(cohortCell(row, k - 1)!.intensity)"
                    :title="k - 1 === row.currentMonthOffset ? `${cohortCell(row, k - 1)!.title} · joriy oy, hali tugamagan` : cohortCell(row, k - 1)!.title"
                  >{{ cohortCell(row, k - 1)!.text }}</div>
                  <div v-else class="cell cell-empty">·</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-[11.5px] mt-3" style="color: var(--text-faint)">
          <template v-if="cohortMode === 'paid'">Foiz — kohortdagi userlarning shu oyda pul to'laganlari. Oylik obunada "1-oy" ustuni = keyingi oyga to'laganlar.</template>
          <template v-else-if="cohortMode === 'active'">Foiz — shu oyda to'langan obunasi amalda bo'lganlar (yillik tarif 12 oy davomida faol hisoblanadi).</template>
          <template v-else>Bitta userga to'g'ri keladigan jami tushum (shu oygacha yig'ilgan).</template>
          Chiziqli ramka — joriy, hali tugamagan oy.
        </p>
      </Card>

      <!-- Tariflar bo'yicha -->
      <Card title="Tarif bo'yicha LTV" subtitle="Userlar birinchi sotib olgan tarif bo'yicha guruhlangan">
        <div class="overflow-x-auto">
          <table class="w-full text-[13.5px]" style="border-collapse: collapse">
            <thead>
              <tr style="border-bottom: 1px solid var(--border)">
                <th class="th">Birinchi tarif</th>
                <th class="th text-right">Userlar</th>
                <th class="th text-right">O'rtacha LTV</th>
                <th class="th text-right">O'rt. to'lovlar</th>
                <th class="th text-right">Keyingi davrga to'lov</th>
                <th class="th" style="min-width: 200px">Tushum ulushi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in planRows" :key="p.key" class="row">
                <td class="td">
                  <span class="plan-pill" :class="{ 'is-family': p.family }">{{ p.label }}</span>
                </td>
                <td class="td text-right font-semibold" style="color: var(--text)">{{ p.users }}</td>
                <td class="td text-right font-semibold" style="color: var(--text)">{{ formatMoney(p.avgLtv, "standard") }}</td>
                <td class="td text-right" style="color: var(--text-muted)">{{ p.avgPayments.toFixed(1) }}</td>
                <td class="td text-right">
                  <template v-if="p.stats.decided">
                    <span class="font-semibold" style="color: var(--text)">{{ pct(p.stats.rate) }}</span>
                    <span class="text-[12px] ml-1" style="color: var(--text-faint)">({{ p.stats.renewed }}/{{ p.stats.decided }})</span>
                  </template>
                  <span v-else class="text-[12px]" style="color: var(--text-faint)">
                    {{ p.stats.pending ? `${p.stats.pending} ta kutilmoqda` : p.stats.unknown ? "Store (avto)" : "—" }}
                  </span>
                </td>
                <td class="td">
                  <div class="flex items-center gap-2.5">
                    <div class="flex-1 h-2 rounded-full overflow-hidden" style="background: var(--surface-hover)">
                      <div class="h-full rounded-full" :style="{ width: p.share + '%', background: p.family ? 'var(--info)' : 'var(--brand)' }"></div>
                    </div>
                    <span class="text-[12px] w-24 text-right whitespace-nowrap" style="color: var(--text-muted)">{{ formatMoney(p.revenue) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Userlar -->
      <Card title="To'lovchi userlar" :subtitle="`${tableUsers.length} ta user · qatorni bosib profilini oching`">
        <template #actions>
          <div class="flex flex-wrap items-center gap-2.5">
            <ElInput v-model="search" placeholder="Ism yoki ID" clearable size="large" style="max-width: 200px" @input="resetPage">
              <template #prefix>
                <svg class="w-4 h-4" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </template>
            </ElInput>
            <ElSelect v-model="statusFilter" placeholder="Holat" clearable size="large" style="width: 180px" @change="resetPage">
              <ElOption v-for="key in statusOrder" :key="key" :label="statusMeta[key].label" :value="key" />
            </ElSelect>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full text-[13.5px]" style="border-collapse: collapse">
            <thead>
              <tr style="border-bottom: 1px solid var(--border)">
                <th class="th">User</th>
                <th class="th">Birinchi tarif</th>
                <th class="th">Birinchi to'lov</th>
                <th class="th text-right">To'lovlar</th>
                <th class="th text-right">LTV</th>
                <th class="th">Obuna tugashi</th>
                <th class="th">Keyingi to'lov</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in pagedUsers" :key="u.userId" class="row cursor-pointer" @click="openUser(u)">
                <td class="td">
                  <div class="font-medium" style="color: var(--text)">{{ u.userName || "—" }}</div>
                  <div class="text-[11.5px]" style="color: var(--text-faint)">ID: {{ u.userId }}</div>
                </td>
                <td class="td whitespace-nowrap">
                  <span class="plan-pill" :class="{ 'is-family': u.first.plan === 'Family' }">{{ planLabel(u.first.plan, u.first.months) }}</span>
                  <span class="text-[11.5px] ml-1.5" style="color: var(--text-faint)">{{ providerLabel(u.first.provider) }}</span>
                </td>
                <td class="td whitespace-nowrap" style="color: var(--text-muted)">{{ formatDate(u.first.at) }}</td>
                <td class="td text-right" style="color: var(--text-muted)">{{ u.payments.length }}</td>
                <td class="td text-right font-semibold whitespace-nowrap" style="color: var(--text)">{{ formatMoney(u.totalPaid, "standard") }}</td>
                <td class="td whitespace-nowrap" style="color: var(--text-muted)">{{ formatDate(u.paidUntil) }}</td>
                <td class="td">
                  <span
                    class="inline-flex px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap"
                    :style="{ background: statusMeta[u.status].soft, color: statusMeta[u.status].fg }"
                    :title="statusMeta[u.status].hint"
                  >{{ statusMeta[u.status].label }}</span>
                  <div v-if="u.status === 'pending'" class="text-[11px] mt-1" style="color: var(--text-faint)">
                    {{ daysLeft(u.paidUntil) }} kun qoldi
                  </div>
                  <div v-else-if="u.secondPaymentAt" class="text-[11px] mt-1" style="color: var(--text-faint)">
                    {{ formatDate(u.secondPaymentAt) }}
                  </div>
                </td>
              </tr>
              <tr v-if="!pagedUsers.length">
                <td colspan="7" class="text-center py-10 text-[14px]" style="color: var(--text-faint)">User topilmadi</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4" style="border-top: 1px solid var(--border)">
          <span class="text-[12.5px]" style="color: var(--text-faint)">{{ page }} / {{ totalPages }} sahifa</span>
          <div class="flex items-center gap-1.5">
            <button class="pg-btn" :disabled="page === 1" @click="page--">Oldingi</button>
            <button class="pg-btn" :disabled="page === totalPages" @click="page++">Keyingi</button>
          </div>
        </div>
      </Card>

      <!-- Qanday hisoblanadi -->
      <Card title="Qanday hisoblanadi?" subtitle="Raqamlar ortidagi qoidalar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[13px] leading-relaxed" style="color: var(--text-muted)">
          <p><b style="color: var(--text)">To'lov</b> — tasdiqlangan va summasi 0 dan katta buyurtma. 100% promokod yoki oilaviy kod bilan olingan premium to'lov hisoblanmaydi.</p>
          <p><b style="color: var(--text)">LTV</b> — userning barcha to'lovlari yig'indisi. O'rtacha LTV = jami tushum ÷ to'lovchi userlar soni.</p>
          <p><b style="color: var(--text)">Qayta to'ladi</b> — birinchi obuna davri tugaguncha yoki undan keyin {{ RENEWAL_GRACE_DAYS }} kun ichida yana to'lagan. Undan keyin to'lasa — "Kech qaytdi".</p>
          <p><b style="color: var(--text)">Keyingi oyga to'lov</b> — faqat birinchi marta <i>oylik</i> tarif olganlar orasida, birinchi oyi tugaganlardan necha foizi qayta to'ladi.</p>
          <p><b style="color: var(--text)">Kohort</b> — userlar birinchi to'lov qilgan oyi bo'yicha guruhlanadi. "1-oy" — xariddan keyingi kalendar oy.</p>
          <p><b style="color: var(--text)">Store (avto)</b> — App Store / Google Play obunasi avto-yangilanadi, lekin backend uni yangi buyurtma sifatida yozmaydi, shuning uchun natija noma'lum.</p>
        </div>
      </Card>
    </template>

    <UserDetailDrawer v-model="detailOpen" :user-id="detailUserId" />
  </div>
</template>

<style scoped>
.seg-active {
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  color: #fff;
  box-shadow: 0 4px 12px rgba(var(--brand-rgb), 0.3);
}
.seg-idle {
  color: var(--text-muted);
}
.seg-idle:hover {
  color: var(--text);
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.btn-ghost:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-hover);
}
.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.skel {
  height: 160px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-hover) 37%, var(--surface-2) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.notice {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.55;
  background: var(--purple-soft);
  color: var(--text-muted);
  border: 1px solid rgba(122, 90, 248, 0.25);
}
.notice svg {
  color: var(--purple);
}
.notice strong {
  color: var(--text);
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.stack-bar {
  display: flex;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface-hover);
}
.stack-bar > div {
  height: 100%;
  transition: width 0.4s ease;
}
.cohort-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
}
.cohort-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  padding: 8px 6px;
  white-space: nowrap;
  text-align: center;
}
.cohort-table td {
  padding: 6px;
  border-top: 1px solid var(--border);
}
.cohort-table td.mcell {
  padding: 3px 2px;
}
.cell {
  min-width: 58px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
  padding: 0 6px;
}
.cell.is-current {
  outline: 1.5px dashed var(--brand-strong);
  outline-offset: -2px;
}
.cell-empty {
  color: var(--text-faint);
  background: transparent;
}
.plan-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--brand-soft);
  color: var(--brand-strong);
}
.plan-pill.is-family {
  background: var(--info-soft);
  color: var(--info);
}
.th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  padding: 12px 14px;
  white-space: nowrap;
}
.th.text-right {
  text-align: right;
}
.td {
  padding: 13px 14px;
}
.row {
  border-bottom: 1px solid var(--border);
  transition: background 0.12s ease;
}
.row:hover {
  background: var(--surface-hover);
}
.pg-btn {
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 9px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  transition: all 0.12s ease;
}
.pg-btn:hover:not(:disabled) {
  color: var(--brand-strong);
  border-color: var(--brand);
}
.pg-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
