<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";
import {
  ElButton,
  ElDatePicker,
  ElRadioGroup,
  ElRadioButton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElSkeleton,
} from "element-plus";
import Card from "../../components/ui/Card.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useThemeStore } from "../../stores/themeStore";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale
);

const dashboardStore = useDashboardStore();
const themeStore = useThemeStore();

const loading = ref(true);

// ── Sana oralig'i filtrlari ─────────────────────────────────────────
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const presetDays = ref<number | "custom">(28);
const dateRange = ref<[string, string] | null>(null);

const applyPreset = (days: number) => {
  presetDays.value = days;
  dateRange.value = null;
  loadData();
};

const onDateRangeChange = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    presetDays.value = "custom";
    loadData();
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    if (presetDays.value === "custom" && dateRange.value) {
      await dashboardStore.loadAiStatistics(
        undefined,
        dateRange.value[0],
        dateRange.value[1]
      );
    } else {
      const days = typeof presetDays.value === "number" ? presetDays.value : 28;
      await dashboardStore.loadAiStatistics(days);
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

const s = computed(() => dashboardStore.aiStatistics);
const hasData = computed(() => (s.value?.totalRequests ?? 0) > 0);

// ── Ranglar va Theme boshqaruvi ─────────────────────────────────────
const cssVar = (name: string) =>
  typeof window !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    : "";

const gridColor = ref("#eaecf1");
const tickColor = ref("#94a3b8");

const refreshThemeColors = () => {
  gridColor.value = cssVar("--border") || "#eaecf1";
  tickColor.value = cssVar("--text-faint") || "#94a3b8";
};

onMounted(refreshThemeColors);
watch(() => themeStore.mode, () => setTimeout(refreshThemeColors, 50));

// ── Chart 1: Kunlik so'rovlar va foydalanuvchilar ───────────────────
const trendLabels = computed(() =>
  (s.value?.dailyTrend ?? []).map((d) => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  })
);

const requestsChartData = computed(() => ({
  labels: trendLabels.value,
  datasets: [
    {
      label: "So'rovlar (Requests)",
      data: (s.value?.dailyTrend ?? []).map((d) => d.requests),
      backgroundColor: "#3b82f6",
      borderRadius: 5,
      maxBarThickness: 24,
    },
    {
      label: "Foydalanuvchilar (Users)",
      data: (s.value?.dailyTrend ?? []).map((d) => d.users),
      backgroundColor: "#10b981",
      borderRadius: 5,
      maxBarThickness: 24,
    },
  ],
}));

const requestsChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: tickColor.value,
        boxWidth: 12,
        boxHeight: 12,
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        title: (items: any) => {
          const idx = items[0]?.dataIndex ?? 0;
          const d = s.value?.dailyTrend?.[idx];
          return d ? `Sana: ${toDateStr(new Date(d.date))}` : "";
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: tickColor.value, font: { size: 11 } },
    },
    y: {
      grid: { color: gridColor.value },
      ticks: { color: tickColor.value, font: { size: 11 } },
      beginAtZero: true,
    },
  },
}));

// ── Chart 2: Kunlik xarajat trendi ($) ──────────────────────────────
const costChartData = computed(() => ({
  labels: trendLabels.value,
  datasets: [
    {
      label: "Xarajat ($)",
      data: (s.value?.dailyTrend ?? []).map((d) => d.costUsd),
      backgroundColor: "#f59e0b",
      borderRadius: 5,
      maxBarThickness: 24,
    },
  ],
}));

const costChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: tickColor.value,
        boxWidth: 12,
        boxHeight: 12,
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `Xarajat: $${Number(ctx.raw).toFixed(4)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: tickColor.value, font: { size: 11 } },
    },
    y: {
      grid: { color: gridColor.value },
      ticks: {
        color: tickColor.value,
        font: { size: 11 },
        callback: (val: any) => `$${val}`,
      },
      beginAtZero: true,
    },
  },
}));
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <!-- ── Sarlavha va Filtrlash paneli ────────────────────────────── -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight" style="color: var(--text)">
          AI Statistikasi
        </h1>
        <p class="text-sm mt-1" style="color: var(--text-faint)">
          Taomlarni aniqlash (Food Recognition) AI modeli faolligi, tokenlar sarfi va xarajatlari tahlili
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Preset tugmalari -->
        <ElRadioGroup :model-value="presetDays" size="default" @change="(v) => applyPreset(v as number)">
          <ElRadioButton :value="7">7 kun</ElRadioButton>
          <ElRadioButton :value="14">14 kun</ElRadioButton>
          <ElRadioButton :value="28">28 kun</ElRadioButton>
          <ElRadioButton :value="30">30 kun</ElRadioButton>
        </ElRadioGroup>

        <!-- Custom Sana oralig'i -->
        <ElDatePicker
          v-model="dateRange"
          type="daterange"
          range-separator="—"
          start-placeholder="Boshlanish"
          end-placeholder="Tugash"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          class="!w-[240px]"
          @change="onDateRangeChange"
        />

        <!-- Yangilash tugmasi -->
        <ElButton :loading="loading" plain @click="loadData">
          Yangilash
        </ElButton>
      </div>
    </div>

    <!-- ── Yuklanmoqda skeleti ─────────────────────────────────────── -->
    <div v-if="loading && !s" class="space-y-4">
      <ElSkeleton :rows="4" animated />
    </div>

    <template v-else-if="s">
      <!-- ── 1. ASOSIY 4 TA KPI KARTASI ─────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <!-- Jami so'rovlar -->
        <div class="app-card p-5 relative overflow-hidden border border-[var(--border)] rounded-xl">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Jami so'rovlar
            </span>
            <span class="p-2 rounded-lg bg-blue-500/10 text-blue-500 font-bold text-xs">
              AI Requests
            </span>
          </div>
          <div class="text-3xl font-extrabold mt-3 text-[var(--text)]">
            {{ s.totalRequests.toLocaleString() }}
          </div>
          <div class="flex items-center gap-2 mt-2.5 text-xs text-[var(--text-faint)]">
            <span class="text-emerald-500 font-medium">✓ {{ s.successRequests.toLocaleString() }} muvaffaqiyatli</span>
            <span v-if="s.errorRequests > 0" class="text-rose-500 font-medium">
              ✕ {{ s.errorRequests }} xato
            </span>
          </div>
        </div>

        <!-- Foydalanuvchilar soni -->
        <div class="app-card p-5 relative overflow-hidden border border-[var(--border)] rounded-xl">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              AI foydalanuvchilari
            </span>
            <span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold text-xs">
              Users
            </span>
          </div>
          <div class="text-3xl font-extrabold mt-3 text-[var(--text)]">
            {{ s.totalAiUsers }} ta
          </div>
          <div class="mt-2.5 text-xs text-[var(--text-faint)]">
            Har bir odam o'rtacha:
            <span class="font-bold text-[var(--text)]">{{ s.avgRequestsPerUser }} ta</span>
            zapros bergan
          </div>
        </div>

        <!-- Jami xarajat -->
        <div class="app-card p-5 relative overflow-hidden border border-[var(--border)] rounded-xl">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Jami xarajat
            </span>
            <span class="p-2 rounded-lg bg-amber-500/10 text-amber-500 font-bold text-xs">
              USD
            </span>
          </div>
          <div class="text-3xl font-extrabold mt-3 text-[var(--text)]">
            ${{ s.totalCostUsd.toFixed(2) }}
          </div>
          <div class="mt-2.5 text-xs space-y-0.5 text-[var(--text-faint)]">
            <div>
              1 request:
              <span class="font-semibold text-[var(--text)]">${{ s.costPerRequestUsd.toFixed(5) }}</span>
            </div>
            <div>
              1 odam:
              <span class="font-semibold text-[var(--text)]">${{ s.costPerUserUsd.toFixed(4) }}</span>
            </div>
          </div>
        </div>

        <!-- Premium foydalanuvchilar qamrovi -->
        <div class="app-card p-5 relative overflow-hidden border border-[var(--border)] rounded-xl">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Premium qamrovi
            </span>
            <span class="p-2 rounded-lg bg-purple-500/10 text-purple-500 font-bold text-xs">
              Adoption
            </span>
          </div>
          <div class="text-3xl font-extrabold mt-3 text-[var(--text)]">
            {{ s.aiAdoptionRatePercent }}%
          </div>
          <div class="mt-2.5 text-xs text-[var(--text-faint)]">
            Jami {{ s.totalPremiumUsers }} ta premium foydalanuvchidan
            <span class="font-bold text-purple-500">{{ s.activeAiPremiumUsers }} tasi</span>
            AI dan foydalangan
          </div>
        </div>
      </div>

      <!-- ── 2. QO'SHIMCHA METRIKALAR PANEL ─────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Min/Max so'rovlar -->
        <div class="app-card p-5 border border-[var(--border)] rounded-xl">
          <h3 class="font-bold text-sm text-[var(--text)] mb-3">Min / Max Zaproslar</h3>
          <div class="space-y-2 text-xs text-[var(--text-muted)]">
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>Bir odam minimal so'rovi:</span>
              <span class="font-bold text-[var(--text)]">{{ s.minRequestsPerUser }} ta</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>Bir odam maksimal so'rovi:</span>
              <span class="font-bold text-[var(--text)] text-amber-500">{{ s.maxRequestsPerUser }} ta</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>Bir kunda ilova bo'yicha min:</span>
              <span class="font-bold text-[var(--text)]">{{ s.minRequestsPerDay }} ta</span>
            </div>
            <div class="flex justify-between items-center py-1">
              <span>Bir kunda ilova bo'yicha max:</span>
              <span class="font-bold text-[var(--text)]">{{ s.maxRequestsPerDay }} ta</span>
            </div>
          </div>
        </div>

        <!-- Tokenlar sarfi -->
        <div class="app-card p-5 border border-[var(--border)] rounded-xl">
          <h3 class="font-bold text-sm text-[var(--text)] mb-3">Tokenlar Sarfi (Gemini 2.5 Flash)</h3>
          <div class="space-y-2 text-xs text-[var(--text-muted)]">
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>Jami tokenlar:</span>
              <span class="font-bold text-[var(--text)]">{{ s.totalTokens.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>Prompt tokenlar ($0.30/1M):</span>
              <span class="font-bold text-[var(--text)]">{{ s.totalPromptTokens.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>Candidate javob ($2.50/1M):</span>
              <span class="font-bold text-[var(--text)]">{{ s.totalCandidateTokens.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between items-center py-1">
              <span>Kunlik o'rtacha zaproslar:</span>
              <span class="font-bold text-[var(--text)]">{{ s.avgRequestsPerDay }} ta / kun</span>
            </div>
          </div>
        </div>

        <!-- Ishlash tezligi va davr -->
        <div class="app-card p-5 border border-[var(--border)] rounded-xl">
          <h3 class="font-bold text-sm text-[var(--text)] mb-3">Tezlik va Davr</h3>
          <div class="space-y-2 text-xs text-[var(--text-muted)]">
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>O'rtacha javob vaqti:</span>
              <span class="font-bold text-[var(--text)]">
                {{ s.avgDurationMs ? (s.avgDurationMs / 1000).toFixed(2) + ' s' : '—' }}
              </span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>Ko'rilayotgan davr:</span>
              <span class="font-bold text-[var(--text)]">{{ s.days }} kun</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>Boshlanish sanasi:</span>
              <span class="font-semibold text-[var(--text-faint)]">{{ toDateStr(new Date(s.from)) }}</span>
            </div>
            <div class="flex justify-between items-center py-1">
              <span>Tugash sanasi:</span>
              <span class="font-semibold text-[var(--text-faint)]">{{ toDateStr(new Date(s.to)) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 3. GRAFIKLAR ───────────────────────────────────────────── -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <!-- So'rovlar va foydalanuvchilar grafigi -->
        <Card title="Kunlik So'rovlar va Foydalanuvchilar" subtitle="Har bir kunlik AI so'rovlari va unikal foydalanuvchilar soni">
          <div class="h-[280px]">
            <Bar :data="requestsChartData" :options="requestsChartOptions" />
          </div>
        </Card>

        <!-- Xarajat dinamikasi grafigi -->
        <Card title="Kunlik AI Xarajati ($)" subtitle="Har kuni sarflangan mablag' (USD)">
          <div class="h-[280px]">
            <Bar :data="costChartData" :options="costChartOptions" />
          </div>
        </Card>
      </div>

      <!-- ── 4. JADVALLAR (Top foydalanuvchilar va Kunlik taqsimot) ─── -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <!-- Top 10 Foydalanuvchilar -->
        <div class="xl:col-span-1">
          <Card title="Top 10 Faol Foydalanuvchilar" subtitle="Eng ko'p zapros bergan foydalanuvchilar">
            <ElTable :data="s.topUsers" size="small" stripe style="width: 100%">
              <ElTableColumn type="index" label="#" width="45" />
              <ElTableColumn prop="userId" label="User ID" width="100">
                <template #default="{ row }">
                  <span class="font-bold text-[var(--primary)]">#{{ row.userId }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="requestCount" label="Zaproslar" align="right">
                <template #default="{ row }">
                  <ElTag size="small" effect="plain" type="primary">
                    {{ row.requestCount }} ta
                  </ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="costUsd" label="Xarajat" align="right">
                <template #default="{ row }">
                  <span class="font-mono text-xs text-amber-500 font-semibold">
                    ${{ Number(row.costUsd).toFixed(4) }}
                  </span>
                </template>
              </ElTableColumn>
            </ElTable>
          </Card>
        </div>

        <!-- Kunlik batafsil jadval -->
        <div class="xl:col-span-2">
          <Card title="Kunlik Batafsil Dinamika" subtitle="Barcha kunlar bo'yicha to'liq statistika">
            <ElTable
              :data="s.dailyTrend.slice().reverse()"
              size="small"
              stripe
              max-height="380"
              style="width: 100%"
            >
              <ElTableColumn prop="date" label="Sana" width="115">
                <template #default="{ row }">
                  <span class="font-medium">{{ toDateStr(new Date(row.date)) }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="requests" label="So'rovlar" align="center" width="95">
                <template #default="{ row }">
                  <span class="font-bold text-blue-500">{{ row.requests }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="users" label="Users" align="center" width="80">
                <template #default="{ row }">
                  <span class="text-emerald-500 font-semibold">{{ row.users }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="promptTokens" label="Prompt tok." align="right">
                <template #default="{ row }">
                  <span class="text-xs text-[var(--text-faint)]">
                    {{ row.promptTokens.toLocaleString() }}
                  </span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="candidateTokens" label="Candidate tok." align="right">
                <template #default="{ row }">
                  <span class="text-xs text-[var(--text-faint)]">
                    {{ row.candidateTokens.toLocaleString() }}
                  </span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="costUsd" label="Xarajat ($)" align="right" width="105">
                <template #default="{ row }">
                  <span class="font-mono text-xs font-semibold text-amber-500">
                    ${{ Number(row.costUsd).toFixed(4) }}
                  </span>
                </template>
              </ElTableColumn>
            </ElTable>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.app-card {
  background: var(--surface);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
}
</style>
