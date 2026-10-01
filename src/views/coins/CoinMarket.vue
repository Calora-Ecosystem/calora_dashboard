<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import { makeFileUrl } from "../../integrations/axios";
import type { AdminMarketItemDto, MarketPurchaseDto, MarketSummaryDto, SaveMarketItemDto } from "../../@types/coin";
import { useIsMobile } from "../../composables/useIsMobile";
import PeriodFilter from "./PeriodFilter.vue";
import {
  MARKET_SUBTITLES,
  apiErrorMessage,
  avatarHue,
  formatDateTime,
  formatDecimal,
  formatNumber,
  initials,
  marketItemLabel,
  periodFromQuery,
  periodToQuery,
  resolvePeriod,
  subtitleLabel,
  type PeriodState,
} from "./coinMeta";

const route = useRoute();
const router = useRouter();
const coinStore = useCoinStore();
const isMobile = useIsMobile();

const period = ref<PeriodState>(periodFromQuery(route.query));
const apiPeriod = computed(() => resolvePeriod(period.value));

const items = ref<AdminMarketItemDto[]>([]);
const summary = ref<MarketSummaryDto | null>(null);
const loading = ref(true);

const load = async () => {
  loading.value = true;
  try {
    const [i, s] = await Promise.all([coinStore.getMarketItems(apiPeriod.value), coinStore.getMarketSummary(apiPeriod.value)]);
    items.value = i ?? [];
    summary.value = s;
  } finally {
    loading.value = false;
  }
};

// Mobile do'kon faqat Premium tariflarni kunlar bo'yicha saralab ko'rsatadi.
const tariffs = computed(() =>
  items.value
    .filter((x) => x.category === "Tariff" && x.rewardType === "PremiumDays")
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.rewardValue - b.rewardValue),
);

const avgPerDay = computed(() => summary.value?.avgCoinsPerEarningDay ?? 0);
const daysToEarn = (price: number) => (avgPerDay.value > 0 ? Math.ceil(price / avgPerDay.value) : null);

// ── Tarif qo'shish / tahrirlash ─────────────────────────────────────
const dialogOpen = ref(false);
const saving = ref(false);
const editing = ref<AdminMarketItemDto | null>(null);
const form = reactive({ days: 30, priceCoins: 300, subtitle: "", isPopular: false, isActive: true });

const openCreate = () => {
  editing.value = null;
  Object.assign(form, { days: 30, priceCoins: 300, subtitle: "", isPopular: false, isActive: true });
  dialogOpen.value = true;
};

const openEdit = (item: AdminMarketItemDto) => {
  editing.value = item;
  Object.assign(form, {
    days: item.rewardValue,
    priceCoins: item.priceCoins,
    subtitle: item.subtitle ?? "",
    isPopular: item.isPopular,
    isActive: item.isActive,
  });
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

const submit = async () => {
  if (!form.days || !form.priceCoins) return;
  saving.value = true;
  try {
    await coinStore.saveMarketItem({
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
      sortOrder: editing.value?.sortOrder ?? form.days,
    });
    ElMessage.success("Saqlandi");
    dialogOpen.value = false;
    await load();
  } catch (e) {
    ElMessage.error(apiErrorMessage(e));
  } finally {
    saving.value = false;
  }
};

const busyId = ref<number | null>(null);
const quickSave = async (item: AdminMarketItemDto, patch: Partial<SaveMarketItemDto>) => {
  busyId.value = item.id;
  try {
    await coinStore.saveMarketItem(toDto(item, patch));
    await load();
  } catch (e) {
    ElMessage.error(apiErrorMessage(e));
  } finally {
    busyId.value = null;
  }
};

const remove = async (item: AdminMarketItemDto) => {
  try {
    await ElMessageBox.confirm(`"${marketItemLabel(item)}" o'chiriladi.`, "O'chirish", {
      confirmButtonText: "O'chirish",
      cancelButtonText: "Bekor",
      type: "warning",
    });
  } catch {
    return;
  }
  try {
    await coinStore.deleteMarketItem(item.id);
    dialogOpen.value = false;
    await load();
  } catch (e) {
    ElMessage.error(apiErrorMessage(e, "O'chirib bo'lmadi"));
  }
};

// ── Xaridlar ────────────────────────────────────────────────────────
const purchases = ref<MarketPurchaseDto[]>([]);
const pTotal = ref(0);
const pPage = ref(1);
const pSize = 15;
const pItem = ref<number | "">("");
const pSearch = ref("");
const pLoading = ref(false);

const loadPurchases = async () => {
  pLoading.value = true;
  try {
    const res = await coinStore.getMarketPurchases(apiPeriod.value, (pPage.value - 1) * pSize, pSize, pItem.value || null, pSearch.value);
    purchases.value = res?.content ?? [];
    pTotal.value = res?.total ?? 0;
  } finally {
    pLoading.value = false;
  }
};

watch(pItem, () => {
  pPage.value = 1;
  loadPurchases();
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(pSearch, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    pPage.value = 1;
    loadPurchases();
  }, 350);
});

watch(period, () => {
  router.replace({ query: periodToQuery(period.value) });
  pPage.value = 1;
  load();
  loadPurchases();
});

onMounted(() => {
  load();
  loadPurchases();
});

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

const openUser = (userId: number) => router.push({ name: "coin_user", params: { userId } });
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1 class="page-title">Coin do'koni</h1>
      <div class="head-tools">
        <PeriodFilter v-model="period" />
        <ElButton type="primary" @click="openCreate">+ Tarif</ElButton>
      </div>
    </header>

    <div class="kpis">
      <div class="app-card kpi">
        <span class="kpi-label">Xaridlar</span>
        <span class="kpi-value">{{ formatNumber(summary?.purchases) }}</span>
        <span class="kpi-sub">{{ formatNumber(summary?.buyers) }} xaridor</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Sarflangan coin</span>
        <span class="kpi-value coin">{{ formatNumber(summary?.coinsSpent) }}</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Berilgan Premium</span>
        <span class="kpi-value">{{ formatNumber(summary?.premiumDaysGranted) }}<small>kun</small></span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Coini yetadi</span>
        <span class="kpi-value">{{ formatNumber(summary?.canAffordCheapest) }}</span>
        <span v-if="summary?.cheapestPrice" class="kpi-sub">≥ {{ formatNumber(summary.cheapestPrice) }} coin</span>
      </div>
    </div>

    <div v-if="loading && !items.length" class="app-card box-pad"><ElSkeleton :rows="3" animated /></div>
    <section v-else class="tariffs">
      <article
        v-for="t in tariffs"
        :key="t.id"
        class="app-card tariff"
        :class="{ off: !t.isActive, popular: t.isPopular && t.isActive }"
        v-loading="busyId === t.id"
      >
        <div class="t-top">
          <span class="t-name">{{ marketItemLabel(t) }}</span>
          <span v-if="t.isPopular" class="chip c-brand">Mashhur</span>
        </div>
        <p class="t-price">{{ formatNumber(t.priceCoins) }} <small>coin</small></p>
        <p class="t-facts t-rate">
          1 kun = {{ formatDecimal(t.coinsPerPremiumDay) }} · ~{{ daysToEarn(t.priceCoins) ?? "—" }} kunda yig'iladi
        </p>
        <p class="t-facts">Sotildi: <b>{{ formatNumber(t.purchases) }}</b> <span class="faint">/ jami {{ formatNumber(t.totalPurchases) }}</span></p>
        <div class="t-actions">
          <ElSwitch :model-value="t.isActive" size="small" @change="(v: any) => quickSave(t, { isActive: !!v })" />
          <span class="faint text-[12px] flex-1">{{ t.isActive ? "Do'konda" : "Yashirin" }}</span>
          <ElButton size="small" text type="primary" @click="openEdit(t)">Tahrir</ElButton>
        </div>
      </article>
    </section>

    <section class="app-card box">
      <div class="box-head">
        <h2 class="box-title">Xaridlar</h2>
        <div class="tools">
          <ElSelect v-model="pItem" placeholder="Barcha tariflar" clearable class="item-select">
            <ElOption v-for="i in tariffs" :key="i.id" :label="marketItemLabel(i)" :value="i.id" />
          </ElSelect>
          <ElInput v-model="pSearch" clearable placeholder="Ism, telefon, ID" class="search" />
        </div>
      </div>
      <div class="tbl-wrap" v-loading="pLoading">
        <table class="tbl">
          <tbody>
            <tr v-for="p in purchases" :key="p.id" class="click" @click="openUser(p.userId)">
              <td>
                <div class="user">
                  <img v-if="p.photo" :src="makeFileUrl(p.photo)" class="avatar" />
                  <span v-else class="avatar" :style="avatarStyle(p.userId)">{{ initials(p.name) }}</span>
                  <div class="min-w-0">
                    <p class="u-name">{{ p.name || "—" }}</p>
                    <p class="u-sub">{{ formatDateTime(p.createdAt) }}</p>
                  </div>
                </div>
              </td>
              <td class="hide-sm faint">{{ p.phone || p.email || `ID ${p.userId}` }}</td>
              <td class="num">
                <p class="nowrap">{{ marketItemLabel(p) }}</p>
                <p class="u-sub coin">{{ formatNumber(p.priceCoins) }} coin</p>
              </td>
            </tr>
            <tr v-if="!purchases.length && !pLoading">
              <td colspan="3" class="empty">Xarid yo'q</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="pTotal > pSize" class="pager">
        <ElPagination
          background
          :small="isMobile"
          :pager-count="isMobile ? 5 : 7"
          layout="prev, pager, next"
          :total="pTotal"
          :page-size="pSize"
          :current-page="pPage"
          @current-change="(p: number) => { pPage = p; loadPurchases(); }"
        />
      </div>
    </section>

    <ElDialog
      v-model="dialogOpen"
      :title="editing ? marketItemLabel(editing) : 'Yangi tarif'"
      :width="isMobile ? '92%' : '400px'"
      align-center
    >
      <div class="dlg">
        <div class="dlg-row">
          <div class="field">
            <label>Kun</label>
            <ElInputNumber v-model="form.days" :min="1" :max="3650" controls-position="right" />
          </div>
          <div class="field">
            <label>Narx (coin)</label>
            <ElInputNumber v-model="form.priceCoins" :min="1" :max="1000000" :step="10" controls-position="right" />
          </div>
        </div>
        <p class="faint text-[12.5px]">
          1 kun = {{ formatDecimal(form.days ? form.priceCoins / form.days : 0) }} coin<template v-if="daysToEarn(form.priceCoins)"> · ~{{ daysToEarn(form.priceCoins) }} kunda yig'iladi</template>
        </p>
        <div class="field">
          <label>Izoh</label>
          <ElSelect v-model="form.subtitle" filterable allow-create clearable placeholder="Ixtiyoriy">
            <ElOption v-for="s in MARKET_SUBTITLES" :key="s.value" :label="s.label" :value="s.value" />
          </ElSelect>
          <span v-if="form.subtitle" class="faint text-[11.5px]">{{ subtitleLabel(form.subtitle) }}</span>
        </div>
        <div class="switches">
          <label><ElSwitch v-model="form.isActive" size="small" /> Do'konda</label>
          <label><ElSwitch v-model="form.isPopular" size="small" /> Mashhur</label>
        </div>
      </div>
      <template #footer>
        <div class="dlg-foot">
          <ElButton v-if="editing && !editing.totalPurchases" text type="danger" @click="remove(editing)">O'chirish</ElButton>
          <span class="flex-1" />
          <ElButton @click="dialogOpen = false">Bekor</ElButton>
          <ElButton type="primary" :loading="saving" @click="submit">Saqlash</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped src="./admin.css"></style>
<style scoped>
.head-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tariffs { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.tariff { padding: 14px; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border); }
.tariff.popular { border-color: rgba(var(--brand-rgb), 0.6); }
.tariff.off { opacity: 0.6; }
.t-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.t-name { font-size: 14.5px; font-weight: 700; color: var(--text); }
.t-price { font-size: 24px; font-weight: 800; color: var(--warning); letter-spacing: -0.4px; }
.t-price small { font-size: 12px; font-weight: 600; color: var(--text-faint); }
.t-facts { font-size: 12px; color: var(--text-muted); }
.t-facts b { color: var(--text); }
.t-actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--border); }
.item-select { width: 170px; }
.dlg { display: flex; flex-direction: column; gap: 12px; }
.dlg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 12px; font-weight: 600; color: var(--text-faint); }
.field :deep(.el-input-number) { width: 100%; }
.switches { display: flex; gap: 18px; }
.switches label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); cursor: pointer; }
.dlg-foot { display: flex; align-items: center; gap: 8px; }
@media (max-width: 640px) {
  .head-tools { width: 100%; display: grid; grid-template-columns: 1fr auto; align-items: start; }
  .tariffs { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .tariff { padding: 11px; }
  .t-price { font-size: 20px; }
  .t-rate { display: none; }
  .item-select { width: 100%; }
}
</style>
