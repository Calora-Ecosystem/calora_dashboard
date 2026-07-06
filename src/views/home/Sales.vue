<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  BarController,
} from "chart.js";
import { Bar, Doughnut } from "vue-chartjs";
import { ElDatePicker, ElSelect, ElOption, ElInput } from "element-plus";
import Card from "../../components/ui/Card.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useThemeStore } from "../../stores/themeStore";
import { formatMoney, formatDate } from "../../utils/FormatHelper";

ChartJS.register(
  Title, Tooltip, Legend, BarElement, ArcElement,
  CategoryScale, LinearScale, DoughnutController, BarController,
);

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();

type Order = {
  id: number;
  userName: string;
  plan: string;
  amount: number;
  createdAt: string;
  orderStatus: string;
  paymentProvider: string;
  coupon?: {
    id: number;
    code: string;
  }
};

const allOrders = ref<Order[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { content } = await dashboardStore.loadSubscriptionOrders(0, 300);
    allOrders.value = content ?? [];
  } finally {
    loading.value = false;
  }
});

/* ---------------- Period / date range ---------------- */
const period = ref<"today" | "week" | "month" | "all">("month");
const dateRange = ref<[Date, Date] | null>(null);

const periods = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "Hafta" },
  { key: "month", label: "Oy" },
  { key: "all", label: "Hammasi" },
] as const;

const DAY = 86400000;
const minOrderDate = computed(() => {
  if (!allOrders.value.length) return new Date(Date.now() - 30 * DAY);
  return new Date(
    Math.min(...allOrders.value.map((o) => new Date(o.createdAt).getTime())),
  );
});

const activeRange = computed<{ start: Date; end: Date }>(() => {
  if (dateRange.value) {
    const [s, e] = dateRange.value;
    const end = new Date(e);
    end.setHours(23, 59, 59, 999);
    return { start: new Date(s), end };
  }
  const end = new Date();
  let start = new Date();
  if (period.value === "today") start.setHours(0, 0, 0, 0);
  else if (period.value === "week") start = new Date(Date.now() - 7 * DAY);
  else if (period.value === "month") start = new Date(Date.now() - 30 * DAY);
  else start = minOrderDate.value;
  return { start, end };
});

const prevRange = computed(() => {
  const { start, end } = activeRange.value;
  const len = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - len), end: start };
});

const inRange = (o: Order, r: { start: Date; end: Date }) => {
  const t = new Date(o.createdAt).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
};

const periodOrders = computed(() =>
  allOrders.value.filter((o) => o.orderStatus == "Confirmed" && inRange(o, activeRange.value)),
);
const prevOrders = computed(() =>
  allOrders.value.filter((o) => o.orderStatus == "Confirmed" && inRange(o, prevRange.value)),
);

const setPeriod = (p: typeof period.value) => {
  dateRange.value = null;
  period.value = p;
};

/* ---------------- KPIs ---------------- */
const sum = (arr: Order[]) => arr.reduce((s, o) => s + (Number(o.amount) || 0), 0);
const growth = (cur: number, prev: number) =>
  prev ? Math.round(((cur - prev) / prev) * 100) : cur ? 100 : 0;

const kpis = computed(() => {
  const cur = periodOrders.value;
  const prev = prevOrders.value;
  const revenue = sum(cur);
  const prevRevenue = sum(prev);
  const avg = cur.length ? revenue / cur.length : 0;
  const prevAvg = prev.length ? prevRevenue / prev.length : 0;
  const customers = new Set(cur.map((o) => o.userName)).size;
  const prevCustomers = new Set(prev.map((o) => o.userName)).size;
  return [
    { label: "Jami tushum", value: formatMoney(revenue), delta: growth(revenue, prevRevenue), glyph: "money", tone: "brand" },
    { label: "Buyurtmalar", value: cur.length.toLocaleString(), delta: growth(cur.length, prev.length), glyph: "cart", tone: "info" },
    { label: "O'rtacha chek", value: formatMoney(avg), delta: growth(avg, prevAvg), glyph: "tag", tone: "purple" },
    { label: "Faol mijozlar", value: customers.toLocaleString(), delta: growth(customers, prevCustomers), glyph: "users", tone: "warning" },
  ];
});

const toneVars: Record<string, { bg: string; fg: string }> = {
  brand: { bg: "var(--brand-soft)", fg: "var(--brand-strong)" },
  info: { bg: "var(--info-soft)", fg: "var(--info)" },
  purple: { bg: "var(--purple-soft)", fg: "var(--purple)" },
  warning: { bg: "var(--warning-soft)", fg: "var(--warning)" },
};

/* ---------------- Revenue over time chart ---------------- */
const buckets = computed(() => {
  const { start, end } = activeRange.value;
  const spanDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY));
  const byMonth = spanDays > 70;
  const map = new Map<string, number>();
  const keyOf = (d: Date) =>
    byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;

  // seed buckets so empty days still show
  if (!byMonth && spanDays <= 45) {
    for (let t = start.getTime(); t <= end.getTime(); t += DAY) {
      map.set(keyOf(new Date(t)), 0);
    }
  }
  for (const o of periodOrders.value) {
    const k = keyOf(new Date(o.createdAt));
    map.set(k, (map.get(k) ?? 0) + (Number(o.amount) || 0));
  }
  return { labels: [...map.keys()], data: [...map.values()] };
});

const revenueChartData = computed(() => ({
  labels: buckets.value.labels,
  datasets: [
    {
      label: "Tushum",
      data: buckets.value.data,
      backgroundColor: "#7cc243",
      hoverBackgroundColor: "#6ba739",
      borderRadius: 6,
      maxBarThickness: 38,
    },
  ],
}));

const cssVar = (n: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const revenueChartOptions = computed(() => {
  themeStore.mode; // reactive dep
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (c: any) => formatMoney(c.parsed.y) },
        backgroundColor: themeStore.mode === "dark" ? "#1a212e" : "#1a202c",
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: cssVar("--text-faint"), font: { size: 11 } } },
      y: { grid: { color: cssVar("--border") }, border: { display: false }, ticks: { color: cssVar("--text-faint"), font: { size: 11 }, callback: (v: any) => formatMoney(v) } },
    },
  };
});

/* ---------------- Status breakdown ---------------- */
const statusTone = (status: string) => {
  const s = (status || "").toLowerCase();
  if (["paid", "success", "completed", "active"].includes(s)) return { fg: "var(--success)", soft: "var(--success-soft)", hex: "#12b76a" };
  if (["pending", "processing", "waiting"].includes(s)) return { fg: "var(--warning)", soft: "var(--warning-soft)", hex: "#f79009" };
  if (["failed", "canceled", "cancelled", "expired"].includes(s)) return { fg: "var(--danger)", soft: "var(--danger-soft)", hex: "#f04438" };
  return { fg: "var(--info)", soft: "var(--info-soft)", hex: "#2e90fa" };
};

const statusGroups = computed(() => {
  const map = new Map<string, number>();
  for (const o of periodOrders.value)
    map.set(o.orderStatus, (map.get(o.orderStatus) ?? 0) + 1);
  return [...map.entries()].map(([status, count]) => ({ status, count }));
});

const statusChartData = computed(() => ({
  labels: statusGroups.value.map((s) => s.status),
  datasets: [
    {
      data: statusGroups.value.map((s) => s.count),
      backgroundColor: statusGroups.value.map((s) => statusTone(s.status).hex),
      borderWidth: 0,
      hoverOffset: 6,
    },
  ],
}));
const statusChartOptions = { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } };

/* ---------------- Plan breakdown ---------------- */
const planColors = ["#7cc243", "#2e90fa", "#7a5af8", "#f79009", "#94a3b8"];
const planGroups = computed(() => {
  const map = new Map<string, number>();
  for (const o of periodOrders.value)
    map.set(o.plan || "Boshqa", (map.get(o.plan || "Boshqa") ?? 0) + (Number(o.amount) || 0));
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([plan, amount]) => ({ plan, amount, pct: total ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
});

/* ---------------- Table (search / status / plan filters + pagination) ---------------- */
const search = ref("");
const statusFilter = ref("");
const planFilter = ref("");
const page = ref(1);
const pageSize = 10;

const statusOptions = computed(() => [...new Set(allOrders.value.map((o) => o.orderStatus))]);
const planOptions = computed(() => [...new Set(allOrders.value.map((o) => o.plan))]);

const tableOrders = computed(() => {
  let rows = periodOrders.value;
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase();
    rows = rows.filter((o) => (o.userName ?? "").toLowerCase().includes(q) || String(o.id).includes(q));
  }
  if (statusFilter.value) rows = rows.filter((o) => o.orderStatus === statusFilter.value);
  if (planFilter.value) rows = rows.filter((o) => o.plan === planFilter.value);
  return [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

const pagedOrders = computed(() => {
  const start = (page.value - 1) * pageSize;
  return tableOrders.value.slice(start, start + pageSize);
});
const totalPages = computed(() => Math.max(1, Math.ceil(tableOrders.value.length / pageSize)));

const resetPage = () => (page.value = 1);
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <!-- Period controls -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="inline-flex p-1 rounded-xl self-start" style="background: var(--surface); border: 1px solid var(--border)">
        <button
          v-for="p in periods"
          :key="p.key"
          class="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
          :class="!dateRange && period === p.key ? 'seg-active' : 'seg-idle'"
          @click="setPeriod(p.key)"
        >{{ p.label }}</button>
      </div>
      <ElDatePicker
        v-model="dateRange"
        type="daterange"
        range-separator="—"
        start-placeholder="Boshlanish"
        end-placeholder="Tugash"
        size="large"
        :clearable="true"
        style="max-width: 320px"
      />
    </div>

    <!-- KPI row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="k in kpis" :key="k.label" class="app-card p-5">
        <div class="flex items-start justify-between">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" :style="{ background: toneVars[k.tone].bg, color: toneVars[k.tone].fg }">
            <svg v-if="k.glyph==='money'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <svg v-else-if="k.glyph==='cart'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <svg v-else-if="k.glyph==='tag'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
          </div>
          <span
            class="flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-full"
            :style="{ background: k.delta >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)', color: k.delta >= 0 ? 'var(--success)' : 'var(--danger)' }"
          >
            <svg class="w-3 h-3" :class="{ 'rotate-180': k.delta < 0 }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            {{ Math.abs(k.delta) }}%
          </span>
        </div>
        <p class="text-[13px] font-medium mt-4" style="color: var(--text-muted)">{{ k.label }}</p>
        <p class="text-[24px] font-bold mt-1 leading-none tracking-tight" style="color: var(--text)">{{ k.value }}</p>
      </div>
    </div>

    <!-- Revenue chart -->
    <Card title="Tushum dinamikasi" subtitle="Tanlangan davr bo'yicha kunlik tushum">
      <div class="h-[300px]">
        <Bar v-if="periodOrders.length" :data="revenueChartData" :options="revenueChartOptions" />
        <div v-else class="h-full flex items-center justify-center text-[14px]" style="color: var(--text-faint)">
          Bu davrda savdolar yo'q
        </div>
      </div>
    </Card>

    <!-- Status + Plan breakdown -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Card title="Holat bo'yicha taqsimot" subtitle="Buyurtmalar holati">
        <div v-if="statusGroups.length" class="flex items-center gap-6">
          <div class="relative w-[160px] h-[160px] shrink-0">
            <Doughnut :data="statusChartData" :options="statusChartOptions" />
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[22px] font-bold" style="color: var(--text)">{{ periodOrders.length }}</span>
              <span class="text-[11px]" style="color: var(--text-faint)">Buyurtma</span>
            </div>
          </div>
          <div class="flex-1 space-y-2.5">
            <div v-for="g in statusGroups" :key="g.status" class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: statusTone(g.status).hex }"></span>
              <span class="text-[13px] flex-1 capitalize" style="color: var(--text-muted)">{{ g.status }}</span>
              <span class="text-[13px] font-semibold" style="color: var(--text)">{{ g.count }}</span>
            </div>
          </div>
        </div>
        <p v-else class="py-8 text-center text-[14px]" style="color: var(--text-faint)">Ma'lumot yo'q</p>
      </Card>

      <Card title="Tariflar bo'yicha tushum" subtitle="Eng ko'p daromad keltirgan tariflar">
        <div v-if="planGroups.length" class="space-y-4 mt-1">
          <div v-for="(p, i) in planGroups" :key="p.plan">
            <div class="flex items-center justify-between text-[13px] mb-1.5">
              <span class="font-medium flex items-center gap-2" style="color: var(--text)">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ background: planColors[i % planColors.length] }"></span>
                {{ p.plan }}
              </span>
              <span class="font-semibold" style="color: var(--text)">{{ formatMoney(p.amount) }}</span>
            </div>
            <div class="h-2 rounded-full overflow-hidden" style="background: var(--surface-hover)">
              <div class="h-full rounded-full transition-all duration-500" :style="{ width: p.pct + '%', background: planColors[i % planColors.length] }"></div>
            </div>
          </div>
        </div>
        <p v-else class="py-8 text-center text-[14px]" style="color: var(--text-faint)">Ma'lumot yo'q</p>
      </Card>
    </div>

    <!-- Detailed sales table -->
    <Card title="Savdolar tafsiloti" :subtitle="`${tableOrders.length} ta buyurtma topildi`">
      <template #actions>
        <div class="flex flex-wrap items-center gap-2.5">
          <ElInput v-model="search" placeholder="Mijoz yoki ID" clearable size="large" style="max-width: 200px" @input="resetPage">
            <template #prefix>
              <svg class="w-4 h-4" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </template>
          </ElInput>
          <ElSelect v-model="statusFilter" placeholder="Holat" clearable size="large" style="width: 150px" @change="resetPage">
            <ElOption v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </ElSelect>
          <ElSelect v-model="planFilter" placeholder="Tarif" clearable size="large" style="width: 140px" @change="resetPage">
            <ElOption v-for="p in planOptions" :key="p" :label="p" :value="p" />
          </ElSelect>
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-[13.5px]" style="border-collapse: collapse">
          <thead>
            <tr style="border-bottom: 1px solid var(--border)">
              <th class="th">ID</th>
              <th class="th">Mijoz</th>
              <th class="th">Tarif</th>
              <th class="th">Provider</th>
              <th class="th">Coupon</th>
              <th class="th text-right">Summa</th>
              <th class="th">Sana</th>
              <th class="th">Holat</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in pagedOrders" :key="o.id" class="row">
              <td class="td" style="color: var(--text-faint)">#{{ o.id }}</td>
              <td class="td font-medium" style="color: var(--text)">{{ o.userName }}</td>
              <td class="td" style="color: var(--text-muted)">{{ o.plan }}</td>
              <td class="td" style="color: var(--text-muted)">{{ o.paymentProvider }}</td>
              <td class="td" style="color: var(--text-muted)">{{ o.coupon?.code || '-' }}</td>
              <td class="td text-right font-semibold" style="color: var(--text)">
                {{ formatMoney(o.amount, 'standard') }}

                </td>
              <td class="td" style="color: var(--text-muted)">{{ formatDate(o.createdAt) }}</td>
              <td class="td">
                <span class="inline-flex px-2.5 py-1 rounded-full text-[11.5px] font-semibold capitalize"
                  :style="{ background: statusTone(o.orderStatus).soft, color: statusTone(o.orderStatus).fg }">
                  {{ o.orderStatus }}
                </span>
              </td>
            </tr>
            <tr v-if="!pagedOrders.length">
              <td colspan="6" class="text-center py-10 text-[14px]" style="color: var(--text-faint)">
                {{ loading ? "Yuklanmoqda..." : "Buyurtmalar topilmadi" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4" style="border-top: 1px solid var(--border)">
        <span class="text-[12.5px]" style="color: var(--text-faint)">{{ page }} / {{ totalPages }} sahifa</span>
        <div class="flex items-center gap-1.5">
          <button class="pg-btn" :disabled="page === 1" @click="page--">Oldingi</button>
          <button class="pg-btn" :disabled="page === totalPages" @click="page++">Keyingi</button>
        </div>
      </div>
    </Card>
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
.th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  padding: 12px 14px;
}
.td {
  padding: 14px 14px;
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
