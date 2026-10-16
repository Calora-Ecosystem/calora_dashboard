<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
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
import { ElDialog, ElInput, ElOption, ElSelect, ElSwitch } from "element-plus";
import Card from "../../components/ui/Card.vue";
import UserDetailDrawer from "../../components/ui/UserDetailDrawer.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useThemeStore } from "../../stores/themeStore";
import { formatDate, formatMoney } from "../../utils/FormatHelper";
import {
  RENEWAL_GRACE_DAYS,
  buildCalendarTable,
  buildLtvUsers,
  isPaidOrder,
  isStoreProvider,
  monthIndex,
  monthLabel,
  monthName,
  monthShort,
  monthYear,
  planKey,
  planLabel,
  renewalStats,
  type CalendarCohort,
  type CohortBuyer,
  type CohortCell,
  type LtvUser,
  type RenewalStatus,
  type StoreSubscription,
  type SubscriptionOrderDto,
} from "../../utils/LtvHelper";

ChartJS.register(Tooltip, Legend, BarElement, BarController, CategoryScale, LinearScale);

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();

/* ---------------- Ma'lumot yuklash + avto-yangilanish ---------------- */
const AUTO_REFRESH_MS = 5 * 60_000;
const STORE_CACHE_MS = 30 * 60_000;

const orders = ref<SubscriptionOrderDto[]>([]);
const storeSubs = ref(new Map<number, StoreSubscription | null>());
const loading = ref(true);
const refreshing = ref(false);
const storeLoading = ref(false);
const updatedAt = ref<Date | null>(null);
let storeFetchedAt = 0;

// IAP orqali to'lagan har bir userning obuna qatori (tugash sanasi) — store
// yangilanishlarini tiklash uchun. 30 daqiqa keshda turadi.
const fetchStoreSubs = async (list: SubscriptionOrderDto[], force: boolean) => {
  const ids = [...new Set(list.filter((o) => isPaidOrder(o) && isStoreProvider(o.paymentProvider)).map((o) => o.userId))];
  const reuse = !force && Date.now() - storeFetchedAt < STORE_CACHE_MS;
  const map = new Map(reuse ? storeSubs.value : []);
  const missing = ids.filter((id) => !map.has(id));
  if (!missing.length) return;

  storeLoading.value = true;
  try {
    let next = 0;
    const worker = async () => {
      while (next < missing.length) {
        const id = missing[next++];
        try {
          map.set(id, await dashboardStore.loadUserSubscription(id));
        } catch {
          // olinmadi — user "Store (noma'lum)" bo'lib qoladi, keyingi yangilanishda qayta so'raladi
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, missing.length) }, worker));
    storeSubs.value = map;
    if (!reuse) storeFetchedAt = Date.now();
  } finally {
    storeLoading.value = false;
  }
};

const load = async (mode: "initial" | "manual" | "auto") => {
  if (mode === "initial") loading.value = true;
  else refreshing.value = true;
  try {
    const list: SubscriptionOrderDto[] = (await dashboardStore.loadAllSubscriptionOrders()) ?? [];
    orders.value = list;
    updatedAt.value = new Date();
    loading.value = false;
    await fetchStoreSubs(list, mode === "manual");
  } catch {
    // xato bildirishnomasi apiCallStore'da ko'rsatiladi
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

let timer: ReturnType<typeof setInterval> | undefined;
const onVisible = () => {
  if (document.visibilityState !== "visible" || refreshing.value) return;
  if (!updatedAt.value || Date.now() - updatedAt.value.getTime() >= AUTO_REFRESH_MS) load("auto");
};

onMounted(() => {
  load("initial");
  timer = setInterval(() => {
    if (document.visibilityState === "visible" && !refreshing.value) load("auto");
  }, AUTO_REFRESH_MS);
  document.addEventListener("visibilitychange", onVisible);
});
onUnmounted(() => {
  clearInterval(timer);
  document.removeEventListener("visibilitychange", onVisible);
});

const updatedLabel = computed(() =>
  updatedAt.value
    ? updatedAt.value.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
    : "",
);

/* ---------------- Filtrlar ---------------- */
const includeStore = ref(true);
const range = ref<"all" | "12" | "6">("all");
const ranges = [
  { key: "all", label: "Hammasi" },
  { key: "12", label: "12 oy" },
  { key: "6", label: "6 oy" },
] as const;
const planFilter = ref<"" | "Premium" | "Family">("");
const providerFilter = ref<"" | "direct" | "store">("");

const allUsers = computed(() => buildLtvUsers(orders.value, includeStore.value ? storeSubs.value : null));

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
  const revenue = list.reduce((s, u) => s + u.totalPaid, 0);
  const payments = list.reduce((s, u) => s + u.payments.length, 0);
  const inferred = list.reduce((s, u) => s + u.payments.filter((p) => p.inferred).length, 0);
  const repeat = list.filter((u) => u.payments.length > 1).length;
  const months = list.reduce((s, u) => s + u.coveredMonths, 0);
  return {
    payers: list.length,
    revenue,
    payments,
    inferred,
    avgLtv: list.length ? revenue / list.length : 0,
    avgPayments: list.length ? payments / list.length : 0,
    avgMonths: list.length ? months / list.length : 0,
    repeat,
    repeatPct: list.length ? (repeat / list.length) * 100 : 0,
  };
});

const monthlyStats = computed(() => renewalStats(users.value.filter((u) => u.first.months === 1)));
const allStats = computed(() => renewalStats(users.value));

const kpis = computed(() => {
  const t = totals.value;
  const m = monthlyStats.value;
  return [
    {
      label: "Jami sotilgan premium",
      value: t.payments.toLocaleString("uz-UZ"),
      sub: `${t.payers} ta xaridor · jami ${formatMoney(t.revenue)}${t.inferred ? ` · ${t.inferred} tasi store (taxminiy)` : ""}`,
      hint: "Shu kungacha bo'lgan barcha pullik to'lovlar soni",
      glyph: "cart",
      tone: "brand",
    },
    {
      label: "O'rtacha LTV",
      value: formatMoney(t.avgLtv),
      sub: `bitta xaridor o'rtacha ${t.avgPayments.toFixed(1)} marta to'lagan · ${t.avgMonths.toFixed(1)} oylik obuna`,
      hint: "Bitta xaridor shu paytgacha keltirgan o'rtacha tushum",
      glyph: "money",
      tone: "info",
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
      tone: "purple",
    },
    {
      label: "Qayta sotib olganlar",
      value: t.payers ? pct(t.repeatPct) : "—",
      sub: `${t.repeat} / ${t.payers} ta xaridor 2 va undan ko'p marta to'lagan`,
      hint: "Kamida ikki marta pul to'lagan xaridorlar ulushi (har qanday tarif)",
      glyph: "users",
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

/* ---------------- Store (IAP) eslatmasi ---------------- */
const storeInfo = computed(() => {
  const store = users.value.filter((u) => u.payments.some((p) => isStoreProvider(p.provider)));
  return { users: store.length, unknown: store.filter((u) => u.status === "unknown").length };
});

/* ---------------- Oyma-oy jadval ---------------- */
const table = computed(() => buildCalendarTable(users.value));
const currentMonth = monthIndex(new Date());

const tableMode = ref<"buyers" | "active" | "revenue">("buyers");
const tableModes = [
  { key: "buyers", label: "Sotib olganlar" },
  { key: "active", label: "Obunasi faol" },
  { key: "revenue", label: "Tushum" },
] as const;

const maxCellRevenue = computed(() =>
  Math.max(1, ...table.value.rows.flatMap((r) => r.cells.map((c) => c?.revenue ?? 0))),
);

const cellView = (row: CalendarCohort, cell: CohortCell) => {
  if (tableMode.value === "revenue") {
    return { main: formatMoney(cell.revenue), sub: "", intensity: cell.revenue / maxCellRevenue.value, inferred: cell.inferredBuyers };
  }
  const count = tableMode.value === "buyers" ? cell.buyers.length : cell.active.length;
  const share = (count / row.users.length) * 100;
  return { main: String(count), sub: `${Math.round(share)}%`, intensity: share / 100, inferred: tableMode.value === "buyers" ? cell.inferredBuyers : 0 };
};

const cellStyle = (intensity: number) => ({
  background: `rgba(var(--brand-rgb), ${(0.05 + intensity * 0.75).toFixed(3)})`,
  color: intensity > 0.55 ? "#fff" : "var(--text)",
});

const cellTitle = (row: CalendarCohort, cell: CohortCell) => {
  const who = `${monthLabel(row.cohort)} da birinchi marta olgan ${row.users.length} ta xaridordan`;
  const when = monthLabel(cell.month);
  let text =
    tableMode.value === "active"
      ? `${who} ${cell.active.length} tasining obunasi ${when} da faol edi`
      : cell.month === row.cohort
        ? `${when}: ${row.users.length} ta yangi xaridor`
        : `${who} ${cell.buyers.length} tasi ${when} da yana sotib oldi`;
  if (tableMode.value !== "active" && cell.inferredBuyers) text += ` (shundan ${cell.inferredBuyers} tasi store yangilanishi, taxminiy)`;
  if (cell.month === currentMonth) text += " · joriy oy, hali tugamagan";
  return `${text}. Ro'yxatni ko'rish uchun bosing`;
};

/* ---------------- Katak ro'yxati (drill-down) ---------------- */
const dialogOpen = ref(false);
const dialogRow = ref<CalendarCohort | null>(null);
const dialogCell = ref<CohortCell | null>(null);
const dialogMode = ref<"buyers" | "active">("buyers");
const dialogTab = ref<"yes" | "no">("yes");

const openCell = (row: CalendarCohort, cell: CohortCell) => {
  dialogRow.value = row;
  dialogCell.value = cell;
  dialogMode.value = tableMode.value === "active" ? "active" : "buyers";
  dialogTab.value = "yes";
  dialogOpen.value = true;
};

const dialogYes = computed<CohortBuyer[]>(() => {
  const cell = dialogCell.value;
  if (!cell) return [];
  if (dialogMode.value === "buyers") return cell.buyers;
  return cell.active.map((user) => ({ user, payments: user.payments.filter((p) => monthIndex(p.at) === cell.month) }));
});
const dialogNo = computed<LtvUser[]>(() => {
  const yes = new Set(dialogYes.value.map((b) => b.user.userId));
  return (dialogRow.value?.users ?? []).filter((u) => !yes.has(u.userId));
});
const dialogTitle = computed(() =>
  dialogRow.value && dialogCell.value
    ? `${monthLabel(dialogRow.value.cohort)} xaridorlari → ${monthLabel(dialogCell.value.month)}`
    : "",
);
const yesLabel = computed(() => (dialogMode.value === "active" ? "Obunasi faol" : "Sotib oldi"));
const noLabel = computed(() => (dialogMode.value === "active" ? "Faol emas" : "Sotib olmadi"));
const lastPayment = (u: LtvUser) => u.payments[u.payments.length - 1];

/* ---------------- Oylik sotuvlar grafigi ---------------- */
const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const monthlyChartData = computed(() => ({
  labels: table.value.totals.map((t) => monthShort(t.month)),
  datasets: [
    {
      label: "Yangi xaridorlar",
      data: table.value.totals.map((t) => t.newBuyers),
      backgroundColor: "#7cc243",
      borderRadius: 4,
      maxBarThickness: 34,
      stack: "s",
    },
    {
      label: "Qaytib sotib olganlar",
      data: table.value.totals.map((t) => t.returning),
      backgroundColor: "#2e90fa",
      borderRadius: 4,
      maxBarThickness: 34,
      stack: "s",
    },
  ],
}));

const monthlyChartOptions = computed(() => {
  themeStore.mode; // reactive dep
  const tick = { color: cssVar("--text-faint"), font: { size: 11 } };
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: themeStore.mode === "dark" ? "#1a212e" : "#1a202c",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (c: any) => ` ${c.dataset.label}: ${c.parsed.y}`,
          footer: (items: any[]) => {
            const t = table.value.totals[items[0]?.dataIndex];
            return t ? `Jami: ${t.payers} xaridor · ${formatMoney(t.revenue, "standard")}` : "";
          },
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: tick },
      y: { stacked: true, beginAtZero: true, grid: { color: cssVar("--border") }, border: { display: false }, ticks: { ...tick, precision: 0 } },
    },
  };
});

/* ---------------- Holatlar ---------------- */
const statusMeta: Record<RenewalStatus, { label: string; fg: string; soft: string; hex: string; hint: string }> = {
  renewed: { label: "Qayta to'ladi", fg: "var(--success)", soft: "var(--success-soft)", hex: "#12b76a", hint: `Muddati tugaguncha yoki ${RENEWAL_GRACE_DAYS} kun ichida yana to'ladi` },
  late: { label: "Kech qaytdi", fg: "var(--info)", soft: "var(--info-soft)", hex: "#2e90fa", hint: "Obunasi tugab, keyinroq qaytib to'ladi" },
  churned: { label: "Qaytmadi", fg: "var(--danger)", soft: "var(--danger-soft)", hex: "#f04438", hint: "Muddat tugadi, qayta to'lov bo'lmadi" },
  pending: { label: "Muddati tugamagan", fg: "var(--warning)", soft: "var(--warning-soft)", hex: "#f79009", hint: "Birinchi obuna davri hali davom etmoqda" },
  unknown: { label: "Store (noma'lum)", fg: "var(--purple)", soft: "var(--purple-soft)", hex: "#7a5af8", hint: "App Store / Google Play yangilanishini tiklab bo'lmadi" },
};
const statusOrder: RenewalStatus[] = ["renewed", "late", "churned", "pending", "unknown"];

const statusRows = computed(() => {
  const s = allStats.value;
  const total = users.value.length || 1;
  return statusOrder
    .map((key) => ({ key, count: s[key], pct: (s[key] / total) * 100, ...statusMeta[key] }))
    .filter((r) => r.key !== "unknown" || r.count > 0);
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
      return {
        key,
        label: planLabel(list[0].first.plan, list[0].first.months),
        family: list[0].first.plan === "Family",
        users: list.length,
        revenue,
        share: (revenue / totalRevenue) * 100,
        avgLtv: revenue / list.length,
        avgPayments: list.reduce((s, u) => s + u.payments.length, 0) / list.length,
        stats: renewalStats(list),
      };
    })
    .sort((a, b) => b.users - a.users);
});

/* ---------------- Xaridorlar jadvali ---------------- */
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

// Userning to'lov qilgan kalendar oylari (taxminiy store oylari alohida belgilanadi)
const paidMonths = (u: LtvUser) => {
  const map = new Map<number, boolean>();
  for (const p of u.payments) {
    const m = monthIndex(p.at);
    map.set(m, (map.get(m) ?? true) && !!p.inferred);
  }
  return [...map.entries()].map(([month, inferred]) => ({ month, inferred }));
};

const daysLeft = (d: Date) => Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
const providerLabel = (p: string) => (isStoreProvider(p) ? "Store" : p);

const detailOpen = ref(false);
const detailUserId = ref<number | null>(null);
const openUser = (u: LtvUser) => {
  detailUserId.value = u.userId;
  detailOpen.value = true;
};
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <!-- Filtrlar -->
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
        <span class="text-[12px]" style="color: var(--text-faint)">birinchi xarid oyi bo'yicha</span>
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <ElSelect v-model="planFilter" placeholder="Barcha tariflar" clearable size="large" style="width: 160px" @change="resetPage">
          <ElOption label="Premium" value="Premium" />
          <ElOption label="Oilaviy" value="Family" />
        </ElSelect>
        <ElSelect v-model="providerFilter" placeholder="Barcha to'lov usullari" clearable size="large" style="width: 200px" @change="resetPage">
          <ElOption label="Payme / Click" value="direct" />
          <ElOption label="App Store / Google Play" value="store" />
        </ElSelect>
        <label class="store-toggle" title="App Store / Google Play avto-yangilanishlarini obuna tugash sanasidan taxminan qo'shish">
          <ElSwitch v-model="includeStore" size="small" />
          <span>Store yangilanishlari</span>
        </label>
        <button class="btn-ghost" :disabled="refreshing || loading" @click="load('manual')">
          <svg class="w-4 h-4" :class="{ 'animate-spin': refreshing || storeLoading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Yangilash
        </button>
      </div>
    </div>
    <div v-if="updatedLabel" class="-mt-2 text-[11.5px] flex items-center gap-1.5" style="color: var(--text-faint)">
      <span class="live-dot"></span>
      Ma'lumot {{ updatedLabel }} da yangilandi · har 5 daqiqada avtomatik yangilanadi
      <template v-if="storeLoading"> · store obunalari yuklanmoqda…</template>
    </div>

    <!-- Yuklanmoqda -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="n in 4" :key="n" class="skel" />
    </div>

    <!-- Bo'sh -->
    <div v-else-if="!users.length" class="app-card py-16 flex flex-col items-center text-center">
      <svg class="w-10 h-10 mb-3" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v14a4 4 0 0 0 4 4h14"/><path d="M7 15l3.5-4 3 2.5L19 7"/></svg>
      <h3 class="text-[15px] font-semibold" style="color: var(--text)">To'lov qilgan xaridorlar topilmadi</h3>
      <p class="text-[13px] mt-1" style="color: var(--text-faint)">Davr yoki filtrlarni o'zgartirib ko'ring</p>
    </div>

    <template v-else>
      <!-- KPI -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="k in kpis" :key="k.label" class="app-card p-5" :title="k.hint">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" :style="{ background: toneVars[k.tone].bg, color: toneVars[k.tone].fg }">
            <svg v-if="k.glyph === 'cart'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <svg v-else-if="k.glyph === 'money'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <svg v-else-if="k.glyph === 'repeat'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p class="text-[13px] font-medium mt-4" style="color: var(--text-muted)">{{ k.label }}</p>
          <p class="text-[24px] font-bold mt-1 leading-none tracking-tight" style="color: var(--text)">{{ k.value }}</p>
          <p class="text-[12px] mt-2 leading-snug" style="color: var(--text-faint)">{{ k.sub }}</p>
        </div>
      </div>

      <!-- Store eslatmasi -->
      <div v-if="storeInfo.users" class="notice">
        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <strong>{{ storeInfo.users }} ta xaridor App Store / Google Play orqali to'lagan.</strong>
          Payme / Click to'lovlari aniq (har biri alohida buyurtma). Store obunasi esa avtomatik yangilanadi va backend
          yangilanishni buyurtma sifatida yozmaydi.
          <template v-if="includeStore">
            Shuning uchun ularning keyingi oylardagi to'lovlari obuna tugash sanasidan <b>taxminan</b> tiklandi — jadvalda
            <span class="inferred-dot inline-block align-middle"></span> bilan belgilangan.
            <template v-if="storeInfo.unknown"> {{ storeInfo.unknown }} tasini tiklab bo'lmadi ("Store (noma'lum)").</template>
          </template>
          <template v-else>Hozir store yangilanishlari hisobga olinmayapti — faqat aniq buyurtmalar ko'rsatilmoqda.</template>
        </div>
      </div>

      <!-- Oyma-oy jadval -->
      <Card title="Oyma-oy qayta sotib olish" subtitle="Har qator — shu oyda birinchi marta premium olganlar; ustunlar — ulardan nechtasi keyingi oylarda yana sotib olgani">
        <template #actions>
          <div class="inline-flex p-1 rounded-xl shrink-0" style="background: var(--surface-2); border: 1px solid var(--border)">
            <button
              v-for="m in tableModes"
              :key="m.key"
              class="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap"
              :class="tableMode === m.key ? 'seg-active' : 'seg-idle'"
              @click="tableMode = m.key"
            >{{ m.label }}</button>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="cal-table">
            <thead>
              <tr>
                <th class="sticky-col text-left">Birinchi xarid</th>
                <th v-for="m in table.months" :key="m" :class="{ 'is-now': m === currentMonth }">
                  <div>{{ monthName(m) }}</div>
                  <div class="font-medium normal-case" style="letter-spacing: 0">{{ monthYear(m) }}</div>
                </th>
                <th class="text-right">Tushum</th>
                <th class="text-right">LTV / xaridor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in table.rows" :key="row.cohort">
                <td class="sticky-col">
                  <div class="font-semibold whitespace-nowrap" style="color: var(--text)">{{ monthLabel(row.cohort) }}</div>
                  <div class="text-[11.5px] whitespace-nowrap" style="color: var(--text-faint)">{{ row.users.length }} ta yangi xaridor</div>
                </td>
                <td v-for="(cell, i) in row.cells" :key="table.months[i]" class="mcell">
                  <button
                    v-if="cell"
                    type="button"
                    class="cell"
                    :class="{ 'is-origin': cell.month === row.cohort, 'is-current': cell.month === currentMonth }"
                    :style="cellStyle(cellView(row, cell).intensity)"
                    :title="cellTitle(row, cell)"
                    @click="openCell(row, cell)"
                  >
                    <span class="cell-main">{{ cellView(row, cell).main }}</span>
                    <span v-if="cellView(row, cell).sub" class="cell-sub">{{ cellView(row, cell).sub }}</span>
                    <span v-if="cellView(row, cell).inferred" class="inferred-dot cell-dot"></span>
                  </button>
                </td>
                <td class="text-right whitespace-nowrap" style="color: var(--text-muted)">{{ formatMoney(row.revenue) }}</td>
                <td class="text-right whitespace-nowrap font-semibold" style="color: var(--text)">{{ formatMoney(row.revenue / row.users.length) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td class="sticky-col">
                  <div class="font-bold" style="color: var(--text)">Jami</div>
                  <div class="text-[11.5px]" style="color: var(--text-faint)">shu oyda to'laganlar</div>
                </td>
                <td v-for="t in table.totals" :key="t.month" class="mcell text-center">
                  <div class="font-bold text-[13px]" style="color: var(--text)">{{ t.payers }}</div>
                  <div class="text-[10.5px] whitespace-nowrap" style="color: var(--text-faint)" :title="`${t.newBuyers} ta yangi, ${t.returning} ta qaytib sotib olgan · ${formatMoney(t.revenue, 'standard')}`">
                    {{ t.newBuyers }} yangi · {{ t.returning }} qayt.
                  </div>
                </td>
                <td class="text-right whitespace-nowrap font-semibold" style="color: var(--text)">{{ formatMoney(totals.revenue) }}</td>
                <td class="text-right whitespace-nowrap font-semibold" style="color: var(--text)">{{ formatMoney(totals.avgLtv) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="text-[11.5px] mt-3 leading-relaxed" style="color: var(--text-faint)">
          <template v-if="tableMode === 'buyers'">Raqam — shu oyda yana pul to'laganlar soni, foiz — qatordagi xaridorlarga nisbatan. Masalan, "Iyul" qatoridagi "Sentabr" katagi: iyulda birinchi marta olganlardan nechtasi sentabrda yana sotib olgani.</template>
          <template v-else-if="tableMode === 'active'">Raqam — shu oyda to'langan obunasi amalda bo'lganlar (3, 6, 12 oylik tarif butun muddat davomida faol hisoblanadi).</template>
          <template v-else>Shu qatordagi xaridorlardan shu oyda tushgan pul.</template>
          Katakni bosing — userlar ro'yxati ochiladi. Chiziqli ramka — joriy, hali tugamagan oy.
        </p>
      </Card>

      <!-- Oylik sotuvlar + holatlar -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div class="xl:col-span-2">
          <Card title="Har oy sotib olganlar" subtitle="Yangi xaridorlar va avval olib, qaytib sotib olganlar">
            <template #actions>
              <div class="flex items-center gap-4 text-[12px]" style="color: var(--text-muted)">
                <span class="flex items-center gap-1.5"><span class="legend-dot" style="background: #7cc243"></span>Yangi</span>
                <span class="flex items-center gap-1.5"><span class="legend-dot" style="background: #2e90fa"></span>Qaytib olgan</span>
              </div>
            </template>
            <div class="h-[300px]">
              <Bar :data="monthlyChartData" :options="monthlyChartOptions" />
            </div>
          </Card>
        </div>

        <Card title="Keyingi to'lov natijasi" subtitle="Birinchi obuna davri tugagach nima bo'ldi">
          <div class="flex items-baseline gap-2">
            <span class="text-[30px] font-extrabold leading-none" style="color: var(--text)">{{ allStats.decided ? pct(allStats.rate) : "—" }}</span>
            <span class="text-[12.5px]" style="color: var(--text-muted)">o'z vaqtida qayta to'ladi</span>
          </div>
          <p class="text-[12px] mt-1.5" style="color: var(--text-faint)">
            Barcha tariflar · {{ allStats.decided }} ta xaridorning birinchi davri tugagan
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

      <!-- Tariflar bo'yicha -->
      <Card title="Tarif bo'yicha LTV" subtitle="Xaridorlar birinchi sotib olgan tarif bo'yicha guruhlangan">
        <div class="overflow-x-auto">
          <table class="w-full text-[13.5px]" style="border-collapse: collapse">
            <thead>
              <tr style="border-bottom: 1px solid var(--border)">
                <th class="th">Birinchi tarif</th>
                <th class="th text-right">Xaridorlar</th>
                <th class="th text-right">O'rtacha LTV</th>
                <th class="th text-right">O'rt. to'lovlar</th>
                <th class="th text-right">Keyingi davrga to'lov</th>
                <th class="th" style="min-width: 200px">Tushum ulushi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in planRows" :key="p.key" class="row">
                <td class="td"><span class="plan-pill" :class="{ 'is-family': p.family }">{{ p.label }}</span></td>
                <td class="td text-right font-semibold" style="color: var(--text)">{{ p.users }}</td>
                <td class="td text-right font-semibold" style="color: var(--text)">{{ formatMoney(p.avgLtv, "standard") }}</td>
                <td class="td text-right" style="color: var(--text-muted)">{{ p.avgPayments.toFixed(1) }}</td>
                <td class="td text-right">
                  <template v-if="p.stats.decided">
                    <span class="font-semibold" style="color: var(--text)">{{ pct(p.stats.rate) }}</span>
                    <span class="text-[12px] ml-1" style="color: var(--text-faint)">({{ p.stats.renewed }}/{{ p.stats.decided }})</span>
                  </template>
                  <span v-else class="text-[12px]" style="color: var(--text-faint)">
                    {{ p.stats.pending ? `${p.stats.pending} ta kutilmoqda` : p.stats.unknown ? "Store (noma'lum)" : "—" }}
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

      <!-- Xaridorlar -->
      <Card title="Xaridorlar" :subtitle="`${tableUsers.length} ta xaridor · qatorni bosib profilini oching`">
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
                <th class="th">Xaridor</th>
                <th class="th">Birinchi tarif</th>
                <th class="th">Birinchi xarid</th>
                <th class="th">To'lagan oylari</th>
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
                <td class="td">
                  <div class="flex flex-wrap gap-1" style="min-width: 140px">
                    <span
                      v-for="pm in paidMonths(u)"
                      :key="pm.month"
                      class="month-chip"
                      :class="{ 'is-inferred': pm.inferred }"
                      :title="pm.inferred ? 'Store yangilanishi (taxminiy)' : `${monthLabel(pm.month)} da to'lagan`"
                    >{{ monthShort(pm.month) }}</span>
                  </div>
                </td>
                <td class="td text-right font-semibold whitespace-nowrap" style="color: var(--text)">{{ formatMoney(u.totalPaid, "standard") }}</td>
                <td class="td whitespace-nowrap" style="color: var(--text-muted)">{{ formatDate(u.paidUntil) }}</td>
                <td class="td">
                  <span
                    class="inline-flex px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap"
                    :style="{ background: statusMeta[u.status].soft, color: statusMeta[u.status].fg }"
                    :title="statusMeta[u.status].hint"
                  >{{ statusMeta[u.status].label }}</span>
                  <div v-if="u.status === 'pending'" class="text-[11px] mt-1" style="color: var(--text-faint)">{{ daysLeft(u.paidUntil) }} kun qoldi</div>
                </td>
              </tr>
              <tr v-if="!pagedUsers.length">
                <td colspan="7" class="text-center py-10 text-[14px]" style="color: var(--text-faint)">Xaridor topilmadi</td>
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
          <p><b style="color: var(--text)">Sotuv</b> — tasdiqlangan va summasi 0 dan katta buyurtma. 100% promokod yoki oilaviy kod bilan olingan premium sotuv hisoblanmaydi.</p>
          <p><b style="color: var(--text)">Qator (kohort)</b> — userlar <i>birinchi marta</i> pul to'lagan oyi bo'yicha guruhlanadi. Keyingi xaridlari o'sha qatorda, to'lagan oyining ustunida ko'rinadi.</p>
          <p><b style="color: var(--text)">LTV</b> — xaridorning barcha to'lovlari yig'indisi. O'rtacha LTV = jami tushum ÷ xaridorlar soni.</p>
          <p><b style="color: var(--text)">Keyingi oyga to'lov</b> — birinchi marta <i>oylik</i> tarif olganlardan, birinchi oyi tugaganlar orasida necha foizi {{ RENEWAL_GRACE_DAYS }} kun ichida yana to'ladi.</p>
          <p><b style="color: var(--text)">Store yangilanishlari</b> — App Store / Google Play har davr boshida pulni o'zi yechadi, backend esa faqat obuna tugash sanasini suradi. Shu sana bo'yicha har davr boshida to'lov bo'lgan deb taxmin qilinadi.</p>
          <p><b style="color: var(--text)">Avto-yangilanish</b> — sahifa har 5 daqiqada (va tabga qaytganingizda) ma'lumotni serverdan qayta oladi.</p>
        </div>
      </Card>
    </template>

    <!-- Katak bo'yicha userlar ro'yxati -->
    <ElDialog v-model="dialogOpen" :title="dialogTitle" width="860px" align-center append-to-body class="ltv-dialog">
      <template v-if="dialogRow && dialogCell">
        <p class="text-[13px] -mt-2 mb-4" style="color: var(--text-muted)">
          {{ monthLabel(dialogRow.cohort) }} da birinchi marta olgan <b>{{ dialogRow.users.length }}</b> ta xaridordan
          <b>{{ dialogYes.length }}</b> tasi
          {{ dialogMode === "active" ? `${monthLabel(dialogCell.month)} da obunasi faol edi` : dialogCell.month === dialogRow.cohort ? `${monthLabel(dialogCell.month)} da sotib oldi` : `${monthLabel(dialogCell.month)} da yana sotib oldi` }}
          ({{ pct((dialogYes.length / dialogRow.users.length) * 100) }}).
        </p>

        <div class="inline-flex p-1 rounded-xl mb-4" style="background: var(--surface-2); border: 1px solid var(--border)">
          <button class="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all" :class="dialogTab === 'yes' ? 'seg-active' : 'seg-idle'" @click="dialogTab = 'yes'">
            {{ yesLabel }} ({{ dialogYes.length }})
          </button>
          <button class="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all" :class="dialogTab === 'no' ? 'seg-active' : 'seg-idle'" @click="dialogTab = 'no'">
            {{ noLabel }} ({{ dialogNo.length }})
          </button>
        </div>

        <div class="overflow-auto" style="max-height: 55vh">
          <table class="w-full text-[13px]" style="border-collapse: collapse">
            <thead>
              <tr style="border-bottom: 1px solid var(--border)">
                <th class="th">Xaridor</th>
                <th class="th">Birinchi xarid</th>
                <th class="th">{{ dialogTab === "yes" ? `${monthName(dialogCell.month)} dagi to'lov` : "Oxirgi to'lov" }}</th>
                <th class="th text-right">LTV</th>
                <th class="th">Obuna tugashi</th>
              </tr>
            </thead>
            <tbody v-if="dialogTab === 'yes'">
              <tr v-for="b in dialogYes" :key="b.user.userId" class="row cursor-pointer" @click="openUser(b.user)">
                <td class="td">
                  <div class="font-medium" style="color: var(--text)">{{ b.user.userName || "—" }}</div>
                  <div class="text-[11.5px]" style="color: var(--text-faint)">ID: {{ b.user.userId }}</div>
                </td>
                <td class="td whitespace-nowrap" style="color: var(--text-muted)">
                  {{ formatDate(b.user.first.at) }}
                  <div class="text-[11.5px]" style="color: var(--text-faint)">{{ planLabel(b.user.first.plan, b.user.first.months) }}</div>
                </td>
                <td class="td">
                  <div v-for="(p, i) in b.payments" :key="i" class="whitespace-nowrap">
                    <span style="color: var(--text)">{{ formatDate(p.at) }}</span>
                    <span class="text-[11.5px] ml-1.5" style="color: var(--text-faint)">{{ formatMoney(p.amount, "standard") }} · {{ providerLabel(p.provider) }}</span>
                    <span v-if="p.inferred" class="mini-badge ml-1.5">taxminiy</span>
                  </div>
                  <span v-if="!b.payments.length" class="text-[12px]" style="color: var(--text-faint)">oldingi to'lov hisobidan</span>
                </td>
                <td class="td text-right font-semibold whitespace-nowrap" style="color: var(--text)">{{ formatMoney(b.user.totalPaid, "standard") }}</td>
                <td class="td whitespace-nowrap" style="color: var(--text-muted)">{{ formatDate(b.user.paidUntil) }}</td>
              </tr>
              <tr v-if="!dialogYes.length"><td colspan="5" class="text-center py-8" style="color: var(--text-faint)">Hech kim</td></tr>
            </tbody>
            <tbody v-else>
              <tr v-for="u in dialogNo" :key="u.userId" class="row cursor-pointer" @click="openUser(u)">
                <td class="td">
                  <div class="font-medium" style="color: var(--text)">{{ u.userName || "—" }}</div>
                  <div class="text-[11.5px]" style="color: var(--text-faint)">ID: {{ u.userId }}</div>
                </td>
                <td class="td whitespace-nowrap" style="color: var(--text-muted)">
                  {{ formatDate(u.first.at) }}
                  <div class="text-[11.5px]" style="color: var(--text-faint)">{{ planLabel(u.first.plan, u.first.months) }}</div>
                </td>
                <td class="td whitespace-nowrap">
                  <span style="color: var(--text)">{{ formatDate(lastPayment(u).at) }}</span>
                  <span v-if="lastPayment(u).inferred" class="mini-badge ml-1.5">taxminiy</span>
                </td>
                <td class="td text-right font-semibold whitespace-nowrap" style="color: var(--text)">{{ formatMoney(u.totalPaid, "standard") }}</td>
                <td class="td whitespace-nowrap" style="color: var(--text-muted)">{{ formatDate(u.paidUntil) }}</td>
              </tr>
              <tr v-if="!dialogNo.length"><td colspan="5" class="text-center py-8" style="color: var(--text-faint)">Hech kim</td></tr>
            </tbody>
          </table>
        </div>
      </template>
    </ElDialog>

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
.store-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  cursor: pointer;
}
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb), 0.2);
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
.inferred-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--purple);
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
.cal-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
}
.cal-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  padding: 8px 6px;
  white-space: nowrap;
  text-align: center;
  line-height: 1.3;
}
.cal-table th.is-now {
  color: var(--brand-strong);
}
.cal-table td {
  padding: 6px 8px;
  border-top: 1px solid var(--border);
}
.cal-table td.mcell {
  padding: 3px 2px;
}
.cal-table tfoot td {
  border-top: 2px solid var(--border);
  padding-top: 8px;
  padding-bottom: 8px;
}
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--surface);
  text-align: left;
  padding-right: 14px !important;
}
.cell {
  position: relative;
  width: 100%;
  min-width: 64px;
  height: 44px;
  border-radius: 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.15;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.cell:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.cell.is-origin {
  box-shadow: inset 0 0 0 1.5px rgba(var(--brand-rgb), 0.9);
}
.cell.is-current {
  outline: 1.5px dashed var(--brand-strong);
  outline-offset: -3px;
}
.cell-main {
  font-weight: 700;
  font-size: 13.5px;
}
.cell-sub {
  font-size: 10.5px;
  font-weight: 600;
  opacity: 0.75;
}
.cell-dot {
  position: absolute;
  top: 5px;
  right: 5px;
}
.month-chip {
  display: inline-flex;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: var(--brand-soft);
  color: var(--brand-strong);
  white-space: nowrap;
}
.month-chip.is-inferred {
  background: var(--purple-soft);
  color: var(--purple);
}
.mini-badge {
  display: inline-flex;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  background: var(--purple-soft);
  color: var(--purple);
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
