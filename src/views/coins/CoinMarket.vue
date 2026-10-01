<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Chart as ChartJS,
  Tooltip,
  BarElement,
  BarController,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";
import {
  ElButton,
  ElDialog,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElSkeleton,
  ElSwitch,
} from "element-plus";
import { useCoinStore } from "../../stores/coinStore";
import { useThemeStore } from "../../stores/themeStore";
import { makeFileUrl } from "../../integrations/axios";
import type {
  AdminMarketItemDto,
  MarketPurchaseDto,
  MarketSummaryDto,
  SaveMarketItemDto,
} from "../../@types/coin";
import PeriodFilter from "./PeriodFilter.vue";
import {
  MARKET_SUBTITLES,
  REWARD_TYPE_LABEL,
  apiErrorMessage,
  avatarHue,
  formatDateTime,
  formatDay,
  formatDayYear,
  formatDecimal,
  formatNumber,
  initials,
  marketItemLabel,
  periodFromQuery,
  periodLabel,
  periodToQuery,
  relativeTime,
  resolvePeriod,
  subtitleLabel,
  type PeriodState,
} from "./coinMeta";

ChartJS.register(Tooltip, BarElement, BarController, CategoryScale, LinearScale);

const route = useRoute();
const router = useRouter();
const coinStore = useCoinStore();
const themeStore = useThemeStore();

const period = ref<PeriodState>(periodFromQuery(route.query));
const apiPeriod = computed(() => resolvePeriod(period.value));

const items = ref<AdminMarketItemDto[]>([]);
const summary = ref<MarketSummaryDto | null>(null);
const loading = ref(true);

const load = async () => {
  loading.value = true;
  try {
    const [i, s] = await Promise.all([
      coinStore.getMarketItems(apiPeriod.value),
      coinStore.getMarketSummary(apiPeriod.value),
    ]);
    items.value = i ?? [];
    summary.value = s;
  } finally {
    loading.value = false;
  }
};

watch(period, () => {
  router.replace({ query: periodToQuery(period.value) });
  load();
  purchasesPage.value = 1;
  loadPurchases();
});

// Mobile do'kon faqat faol Premium tariflarni kunlar bo'yicha saralab ko'rsatadi.
const tariffs = computed(() =>
  items.value
    .filter((x) => x.category === "Tariff" && x.rewardType === "PremiumDays")
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.rewardValue - b.rewardValue),
);
const others = computed(() =>
  items.value.filter((x) => !(x.category === "Tariff" && x.rewardType === "PremiumDays")),
);
const showOthers = ref(false);

const periodText = computed(() =>
  summary.value ? periodLabel(summary.value.from, summary.value.to) : "",
);

// ── Tarif qo'shish / tahrirlash ─────────────────────────────────────
const dialogOpen = ref(false);
const saving = ref(false);
const editing = ref<AdminMarketItemDto | null>(null);
const form = reactive({
  days: 30,
  priceCoins: 300,
  subtitle: "" as string,
  isPopular: false,
  isActive: true,
  sortOrder: 0,
});

const openCreate = () => {
  editing.value = null;
  form.days = 30;
  form.priceCoins = 300;
  form.subtitle = "";
  form.isPopular = false;
  form.isActive = true;
  form.sortOrder = (tariffs.value.length + 1) * 10;
  dialogOpen.value = true;
};

const openEdit = (item: AdminMarketItemDto) => {
  editing.value = item;
  form.days = item.rewardValue;
  form.priceCoins = item.priceCoins;
  form.subtitle = item.subtitle ?? "";
  form.isPopular = item.isPopular;
  form.isActive = item.isActive;
  form.sortOrder = item.sortOrder;
  dialogOpen.value = true;
};

const toDto = (item: AdminMarketItemDto, patch: Partial<SaveMarketItemDto> = {}): SaveMarketItemDto => ({
  id: item.id,
  title: item.title,
  subtitle: item.subtitle,
  priceCoins: item.priceCoins,
  category: item.category,
  rewardType: item.rewardType,
  rewardValue: item.rewardValue,
  isPopular: item.isPopular,
  isActive: item.isActive,
  sortOrder: item.sortOrder,
  ...patch,
});

const avgPerDay = computed(() => summary.value?.avgCoinsPerEarningDay ?? 0);
const daysToEarn = (price: number) =>
  avgPerDay.value > 0 ? Math.ceil(price / avgPerDay.value) : null;

const formPerDay = computed(() => (form.days > 0 ? form.priceCoins / form.days : 0));
const duplicateDays = computed(() =>
  tariffs.value.some((x) => x.rewardValue === form.days && x.id !== editing.value?.id && x.isActive),
);

const submit = async () => {
  if (!form.days || !form.priceCoins) return;
  saving.value = true;
  try {
    const dto: SaveMarketItemDto = {
      ...(editing.value ? toDto(editing.value) : {}),
      id: editing.value?.id,
      // Mobile nomni shu kalit bo'yicha tarjima qiladi ("Premium 30 kun").
      title: `mi_premium_${form.days}`,
      subtitle: form.subtitle.trim() || null,
      priceCoins: form.priceCoins,
      category: "Tariff",
      rewardType: "PremiumDays",
      rewardValue: form.days,
      isPopular: form.isPopular,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };
    await coinStore.saveMarketItem(dto);
    ElMessage.success(editing.value ? "Tarif yangilandi" : "Tarif qo'shildi");
    dialogOpen.value = false;
    await load();
  } catch (e) {
    ElMessage.error(apiErrorMessage(e));
  } finally {
    saving.value = false;
  }
};

const busyId = ref<number | null>(null);

const quickSave = async (item: AdminMarketItemDto, patch: Partial<SaveMarketItemDto>, message: string) => {
  busyId.value = item.id;
  try {
    await coinStore.saveMarketItem(toDto(item, patch));
    ElMessage.success(message);
    await load();
  } catch (e) {
    ElMessage.error(apiErrorMessage(e));
  } finally {
    busyId.value = null;
  }
};

const toggleActive = (item: AdminMarketItemDto, value: boolean) =>
  quickSave(item, { isActive: value }, value ? "Tarif do'konda ko'rinadi" : "Tarif do'kondan yashirildi");

const makePopular = (item: AdminMarketItemDto) =>
  quickSave(item, { isPopular: !item.isPopular }, item.isPopular ? "Belgi olib tashlandi" : "\"Mashhur\" deb belgilandi");

const remove = async (item: AdminMarketItemDto) => {
  try {
    await ElMessageBox.confirm(
      `"${marketItemLabel(item)}" do'kondan butunlay o'chiriladi.`,
      "Tarifni o'chirish",
      { confirmButtonText: "O'chirish", cancelButtonText: "Bekor qilish", type: "warning" },
    );
  } catch {
    return;
  }
  try {
    await coinStore.deleteMarketItem(item.id);
    ElMessage.success("O'chirildi");
    await load();
  } catch (e) {
    ElMessage.error(apiErrorMessage(e, "O'chirib bo'lmadi"));
  }
};

// ── Grafik ───────────────────────────────────────────────────────────
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
  const days = summary.value?.days ?? [];
  return {
    labels: days.map((x) => formatDay(x.date)),
    datasets: [
      {
        label: "Xaridlar",
        data: days.map((x) => x.purchases),
        backgroundColor: "#7cc243",
        borderRadius: 4,
        maxBarThickness: 22,
      },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items: any[]) => {
          const day = summary.value?.days[items[0]?.dataIndex ?? 0];
          return day ? formatDayYear(day.date) : "";
        },
        footer: (items: any[]) => {
          const day = summary.value?.days[items[0]?.dataIndex ?? 0];
          return day ? `${formatNumber(day.coinsSpent)} coin sarflandi` : "";
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: tickColor.value, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 8 } },
    y: { beginAtZero: true, grid: { color: gridColor.value }, ticks: { color: tickColor.value, font: { size: 11 }, precision: 0 } },
  },
}));

// ── Xaridlar tarixi ─────────────────────────────────────────────────
const purchases = ref<MarketPurchaseDto[]>([]);
const purchasesTotal = ref(0);
const purchasesPage = ref(1);
const purchasesSize = 15;
const purchasesItem = ref<number | "">("");
const purchasesSearch = ref("");
const purchasesLoading = ref(false);

const loadPurchases = async () => {
  purchasesLoading.value = true;
  try {
    const res = await coinStore.getMarketPurchases(
      apiPeriod.value,
      (purchasesPage.value - 1) * purchasesSize,
      purchasesSize,
      purchasesItem.value || null,
      purchasesSearch.value,
    );
    purchases.value = res?.content ?? [];
    purchasesTotal.value = res?.total ?? 0;
  } finally {
    purchasesLoading.value = false;
  }
};

watch(purchasesItem, () => {
  purchasesPage.value = 1;
  loadPurchases();
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(purchasesSearch, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    purchasesPage.value = 1;
    loadPurchases();
  }, 350);
});

const onPurchasesPage = (p: number) => {
  purchasesPage.value = p;
  loadPurchases();
};

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

const openUser = (userId: number) =>
  router.push({ name: "coin_user", params: { userId } });

onMounted(() => {
  refreshThemeColors();
  load();
  loadPurchases();
});
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">
          <svg-icon icon="navbar/money-bag.svg" class="title-icon" />
          Coin do'koni
        </h1>
        <p class="page-sub">
          Premium tariflar narxini coin'da belgilang — mobile ilovadagi do'kon shu ro'yxatni ko'rsatadi
        </p>
      </div>
      <div class="flex items-center gap-2.5 flex-wrap">
        <PeriodFilter v-model="period" />
        <ElButton type="primary" @click="openCreate">+ Tarif qo'shish</ElButton>
      </div>
    </header>

    <p v-if="periodText" class="period-note">
      <b>{{ periodText }}</b>
      <span>
        · Joriy qoida: {{ formatNumber(summary?.stepsPerCoin) }} qadam = 1 coin, kuniga ≤ {{ summary?.maxDailyCoins }} ·
        faol user kuniga o'rtacha {{ formatDecimal(avgPerDay) }} coin yig'adi
      </span>
      <router-link :to="{ name: 'coin_rules' }" class="link">Qoidani o'zgartirish</router-link>
    </p>

    <!-- KPI -->
    <div class="grid grid-cols-2 xl:grid-cols-5 gap-4">
      <div class="app-card kpi">
        <span class="kpi-label">Xaridlar</span>
        <span class="kpi-value">{{ formatNumber(summary?.purchases) }}</span>
        <span class="kpi-sub">{{ formatNumber(summary?.buyers) }} xaridor · {{ formatNumber(summary?.repeatBuyers) }} takroriy</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Sarflangan coin</span>
        <span class="kpi-value coin">{{ formatNumber(summary?.coinsSpent) }}</span>
        <span class="kpi-sub">muomalada {{ formatNumber(summary?.balanceInCirculation) }} coin</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Berilgan Premium</span>
        <span class="kpi-value">{{ formatNumber(summary?.premiumDaysGranted) }} <small>kun</small></span>
        <span class="kpi-sub">do'kon orqali</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Sotib olishga yetadi</span>
        <span class="kpi-value">{{ formatNumber(summary?.canAffordCheapest) }}</span>
        <span class="kpi-sub">
          <template v-if="summary?.cheapestPrice">user'da ≥ {{ formatNumber(summary.cheapestPrice) }} coin bor</template>
          <template v-else>faol tarif yo'q</template>
        </span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Faol tariflar</span>
        <span class="kpi-value">{{ tariffs.filter((x) => x.isActive).length }}</span>
        <span class="kpi-sub">mobile do'konda ko'rinadi</span>
      </div>
    </div>

    <!-- Tariflar -->
    <div v-if="loading && !items.length" class="app-card p-6"><ElSkeleton :rows="4" animated /></div>
    <section v-else class="tariff-grid">
      <article
        v-for="t in tariffs"
        :key="t.id"
        class="app-card tariff"
        :class="{ inactive: !t.isActive, popular: t.isPopular && t.isActive }"
        v-loading="busyId === t.id"
      >
        <div class="tariff-top">
          <span class="crown">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" /></svg>
          </span>
          <div class="flex items-center gap-1.5 flex-wrap justify-end">
            <span v-if="t.isPopular" class="badge b-popular">Mashhur</span>
            <span v-if="t.isActive" class="badge b-live">Do'konda</span>
            <span v-else class="badge b-off">Yashirin</span>
          </div>
        </div>
        <h3 class="tariff-name">{{ marketItemLabel(t) }}</h3>
        <p class="tariff-sub">{{ subtitleLabel(t.subtitle) || "—" }}</p>
        <p class="tariff-price">{{ formatNumber(t.priceCoins) }} <small>coin</small></p>
        <ul class="tariff-facts">
          <li><span>1 kun Premium</span><b>{{ formatDecimal(t.coinsPerPremiumDay) }} coin</b></li>
          <li><span>Faol user yig'adi</span><b>~{{ daysToEarn(t.priceCoins) ?? "—" }} kunda</b></li>
          <li><span>Davrda sotildi</span><b>{{ formatNumber(t.purchases) }} ta · {{ formatNumber(t.buyers) }} user</b></li>
          <li><span>Jami sotilgan</span><b>{{ formatNumber(t.totalPurchases) }} ta</b></li>
          <li><span>Oxirgi xarid</span><b>{{ relativeTime(t.lastPurchaseAt) }}</b></li>
        </ul>
        <div class="tariff-actions">
          <label class="switch-label">
            <ElSwitch :model-value="t.isActive" size="small" @change="(v: any) => toggleActive(t, !!v)" />
            Faol
          </label>
          <div class="flex gap-1">
            <ElButton size="small" text @click="makePopular(t)">{{ t.isPopular ? "Mashhurni olish" : "Mashhur" }}</ElButton>
            <ElButton size="small" text type="primary" @click="openEdit(t)">Tahrirlash</ElButton>
            <ElButton
              v-if="!t.totalPurchases"
              size="small"
              text
              type="danger"
              @click="remove(t)"
            >O'chirish</ElButton>
          </div>
        </div>
      </article>

      <button class="app-card tariff add" @click="openCreate">
        <span class="add-plus">+</span>
        <span>Yangi tarif</span>
        <small>masalan, 14 yoki 365 kun</small>
      </button>
    </section>

    <section v-if="others.length" class="app-card others">
      <button class="others-head" @click="showOthers = !showOthers">
        <span>Boshqa mahsulotlar ({{ others.length }}) — mobile do'konda ko'rsatilmaydi</span>
        <svg :class="{ 'rotate-90': showOthers }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      <div v-if="showOthers" class="others-list">
        <div v-for="o in others" :key="o.id" class="other-row">
          <span class="o-name">{{ marketItemLabel(o) }}</span>
          <span class="faint">{{ REWARD_TYPE_LABEL[o.rewardType] ?? o.rewardType }}</span>
          <span class="t-price">{{ formatNumber(o.priceCoins) }} coin</span>
          <span class="faint">{{ formatNumber(o.totalPurchases) }} ta sotilgan</span>
          <span class="badge" :class="o.isActive ? 'b-live' : 'b-off'">{{ o.isActive ? "Faol" : "Nofaol" }}</span>
        </div>
      </div>
    </section>

    <!-- Grafik + xaridlar -->
    <div class="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
      <section class="app-card chart-card">
        <h2 class="section-title">Kunlik xaridlar</h2>
        <p class="section-sub">{{ periodText }}</p>
        <div class="chart-box">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </section>

      <section class="app-card table-card">
        <div class="table-toolbar">
          <h2 class="section-title">Xaridlar tarixi</h2>
          <div class="flex items-center gap-2 flex-wrap">
            <ElSelect v-model="purchasesItem" placeholder="Barcha tariflar" clearable style="width: 180px">
              <ElOption v-for="i in items" :key="i.id" :label="marketItemLabel(i)" :value="i.id" />
            </ElSelect>
            <ElInput v-model="purchasesSearch" clearable placeholder="Ism, telefon yoki ID" style="width: 220px" />
          </div>
        </div>
        <div class="table-wrap" v-loading="purchasesLoading">
          <table class="lb">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Foydalanuvchi</th>
                <th>Tarif</th>
                <th class="num">Narx</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in purchases" :key="p.id" class="clickable" @click="openUser(p.userId)">
                <td class="nowrap muted">{{ formatDateTime(p.createdAt) }}</td>
                <td>
                  <div class="user-cell">
                    <img v-if="p.photo" :src="makeFileUrl(p.photo)" class="avatar" />
                    <span v-else class="avatar" :style="avatarStyle(p.userId)">{{ initials(p.name) }}</span>
                    <div class="min-w-0">
                      <p class="user-name">{{ p.name || "—" }}</p>
                      <p class="user-sub">ID {{ p.userId }}<span v-if="p.phone || p.email"> · {{ p.phone || p.email }}</span></p>
                    </div>
                  </div>
                </td>
                <td>{{ marketItemLabel(p) }}</td>
                <td class="num"><b class="coin">{{ formatNumber(p.priceCoins) }}</b></td>
              </tr>
              <tr v-if="!purchases.length && !purchasesLoading">
                <td colspan="4" class="empty">Bu davrda xarid yo'q</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="purchasesTotal > purchasesSize" class="pager">
          <ElPagination
            background
            layout="prev, pager, next"
            :total="purchasesTotal"
            :page-size="purchasesSize"
            :current-page="purchasesPage"
            @current-change="onPurchasesPage"
          />
        </div>
      </section>
    </div>

    <!-- Dialog -->
    <ElDialog v-model="dialogOpen" :title="editing ? 'Tarifni tahrirlash' : 'Yangi Premium tarif'" width="460px" align-center>
      <div class="dlg">
        <div class="dlg-row">
          <div class="field">
            <label class="field-label">Premium muddati (kun)</label>
            <ElInputNumber v-model="form.days" :min="1" :max="3650" controls-position="right" class="w-full" />
          </div>
          <div class="field">
            <label class="field-label">Narxi (coin)</label>
            <ElInputNumber v-model="form.priceCoins" :min="1" :max="1000000" :step="10" controls-position="right" class="w-full" />
          </div>
        </div>
        <p class="dlg-hint">
          1 kun = <b>{{ formatDecimal(formPerDay) }}</b> coin
          <template v-if="daysToEarn(form.priceCoins)"> · faol user ~<b>{{ daysToEarn(form.priceCoins) }}</b> kunda yig'adi</template>
        </p>
        <p v-if="duplicateDays" class="dlg-warn">Do'konda {{ form.days }} kunlik faol tarif allaqachon bor.</p>

        <div class="field">
          <label class="field-label">Qisqa izoh (kartada)</label>
          <ElSelect v-model="form.subtitle" filterable allow-create clearable placeholder="Tanlang yoki yozing" class="w-full">
            <ElOption v-for="s in MARKET_SUBTITLES" :key="s.value" :label="s.label" :value="s.value" />
          </ElSelect>
          <span class="field-hint">Ro'yxatdagilar ilova tilida tarjima qilinadi; o'zingiz yozgan matn hamma tilda shunday chiqadi.</span>
        </div>

        <div class="dlg-row">
          <div class="field">
            <label class="field-label">Tartib raqami</label>
            <ElInputNumber v-model="form.sortOrder" :min="0" :max="10000" controls-position="right" class="w-full" />
          </div>
          <div class="field switches">
            <label class="switch-label"><ElSwitch v-model="form.isActive" /> Do'konda ko'rinsin</label>
            <label class="switch-label"><ElSwitch v-model="form.isPopular" /> "Mashhur" belgisi</label>
          </div>
        </div>

        <div class="dlg-preview">
          <span class="crown sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" /></svg>
          </span>
          <div class="min-w-0 flex-1">
            <p class="pv-name">Premium {{ form.days }} kun</p>
            <p class="pv-sub">{{ subtitleLabel(form.subtitle) || " " }}</p>
          </div>
          <span class="pv-price">{{ formatNumber(form.priceCoins) }} coin</span>
        </div>
      </div>
      <template #footer>
        <ElButton @click="dialogOpen = false">Bekor qilish</ElButton>
        <ElButton type="primary" :loading="saving" @click="submit">Saqlash</ElButton>
      </template>
    </ElDialog>
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
.link { margin-left: 8px; font-weight: 600; color: var(--brand-strong); }
.section-title { font-size: 16px; font-weight: 700; color: var(--text); }
.section-sub { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }
.faint { color: var(--text-faint); }
.muted { color: var(--text-muted); }
.nowrap { white-space: nowrap; }
.coin, .t-price { color: var(--warning); font-weight: 700; }

.kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kpi-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); }
.kpi-value { font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.kpi-value small { font-size: 13px; font-weight: 600; color: var(--text-faint); }
.kpi-value.coin { color: var(--warning); }
.kpi-sub { font-size: 12px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Tariflar */
.tariff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.tariff { padding: 16px; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border); position: relative; }
.tariff.popular { border-color: rgba(var(--brand-rgb), 0.6); box-shadow: 0 6px 18px rgba(var(--brand-rgb), 0.15); }
.tariff.inactive { opacity: 0.72; }
.tariff-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.crown { width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: var(--brand-soft); color: var(--brand-strong); flex-shrink: 0; }
.crown svg { width: 22px; height: 22px; }
.crown.sm { width: 34px; height: 34px; border-radius: 10px; }
.crown.sm svg { width: 18px; height: 18px; }
.badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.b-popular { color: #fff; background: var(--brand-strong); }
.b-live { color: var(--success); background: var(--success-soft); }
.b-off { color: var(--text-faint); background: var(--surface-2); }
.tariff-name { font-size: 16px; font-weight: 800; color: var(--text); margin-top: 10px; }
.tariff-sub { font-size: 12.5px; color: var(--text-faint); }
.tariff-price { font-size: 28px; font-weight: 800; color: var(--warning); letter-spacing: -0.5px; margin-top: 6px; }
.tariff-price small { font-size: 13px; color: var(--text-faint); font-weight: 600; }
.tariff-facts { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; padding-top: 10px; border-top: 1px dashed var(--border); font-size: 12.5px; }
.tariff-facts li { display: flex; justify-content: space-between; gap: 10px; color: var(--text-faint); }
.tariff-facts b { color: var(--text); font-weight: 600; text-align: right; }
.tariff-actions { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-top: auto; padding-top: 12px; flex-wrap: wrap; }
.switch-label { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-muted); cursor: pointer; }
.tariff.add { align-items: center; justify-content: center; text-align: center; gap: 4px; min-height: 220px; border: 1.5px dashed var(--border); color: var(--text-muted); font-weight: 600; cursor: pointer; transition: all 0.15s; }
.tariff.add:hover { border-color: rgba(var(--brand-rgb), 0.6); color: var(--brand-strong); }
.add-plus { font-size: 30px; line-height: 1; }
.tariff.add small { font-weight: 500; color: var(--text-faint); }

.others { padding: 0; overflow: hidden; }
.others-head { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; font-size: 13px; font-weight: 600; color: var(--text-muted); }
.others-head svg { width: 16px; height: 16px; transition: transform 0.2s; }
.others-list { border-top: 1px solid var(--border); }
.other-row { display: grid; grid-template-columns: minmax(0, 1.4fr) 1fr auto auto auto; gap: 14px; align-items: center; padding: 10px 16px; font-size: 13px; border-top: 1px solid var(--border); }
.other-row:first-child { border-top: none; }
.o-name { font-weight: 600; color: var(--text); }

.chart-card { padding: 18px; }
.chart-box { height: 240px; margin-top: 12px; }

.table-card { padding: 0; overflow: hidden; }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 14px 16px; }
.table-wrap { overflow-x: auto; }
.lb { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 620px; }
.lb th { text-align: left; padding: 12px 14px; font-size: 11.5px; font-weight: 600; white-space: nowrap; color: var(--text-faint); background: var(--surface-2); text-transform: uppercase; letter-spacing: 0.3px; }
.lb td { padding: 10px 14px; border-top: 1px solid var(--border); color: var(--text); }
.lb .num, .lb th.num { text-align: right; }
.lb tr.clickable { cursor: pointer; }
.lb tr.clickable:hover { background: var(--surface-2); }
.user-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; object-fit: cover; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.user-name { font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
.user-sub { font-size: 12px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
.empty { text-align: center; color: var(--text-faint); padding: 30px; }
.pager { display: flex; justify-content: flex-end; padding: 14px 16px; border-top: 1px solid var(--border); }

/* Dialog */
.dlg { display: flex; flex-direction: column; gap: 14px; }
.dlg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--text-muted); }
.field-hint { font-size: 11.5px; color: var(--text-faint); }
.switches { justify-content: flex-end; gap: 10px; }
.dlg-hint { font-size: 12.5px; color: var(--text-muted); margin-top: -6px; }
.dlg-hint b { color: var(--text); }
.dlg-warn { font-size: 12.5px; color: var(--warning); background: var(--warning-soft); padding: 8px 10px; border-radius: 8px; }
.dlg-preview { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface-2); }
.pv-name { font-weight: 700; color: var(--text); font-size: 14px; }
.pv-sub { font-size: 12px; color: var(--text-faint); min-height: 16px; }
.pv-price { padding: 7px 12px; border-radius: 10px; background: var(--brand-strong); color: #fff; font-weight: 700; font-size: 13px; white-space: nowrap; }

@media (max-width: 700px) {
  .page-title { font-size: 19px; }
  .other-row { grid-template-columns: minmax(0, 1fr) auto; }
  .dlg-row { grid-template-columns: 1fr; }
}
</style>
