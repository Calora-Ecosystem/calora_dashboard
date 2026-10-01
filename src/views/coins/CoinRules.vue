<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElButton, ElDatePicker, ElInputNumber, ElMessage, ElMessageBox, ElSkeleton } from "element-plus";
import { useCoinStore } from "../../stores/coinStore";
import type { AdminMarketItemDto, CoinRuleDto, CoinRuleImpactDto, CoinRulePreviewDto, CoinRulesDto } from "../../@types/coin";
import { apiErrorMessage, formatDay, formatDayYear, formatDecimal, formatNumber, formatPercent, marketItemLabel, toDateStr } from "./coinMeta";
import CoinEarnStartCard from "./CoinEarnStartCard.vue";

const coinStore = useCoinStore();

const rules = ref<CoinRulesDto | null>(null);
const items = ref<AdminMarketItemDto[]>([]);
const loading = ref(true);
const saving = ref(false);

const form = reactive({ stepsPerCoin: 1000, maxDailyCoins: 22, effectiveFrom: toDateStr(new Date()) });

const resetForm = () => {
  const c = rules.value?.current;
  if (!c) return;
  form.stepsPerCoin = c.stepsPerCoin;
  form.maxDailyCoins = c.maxDailyCoins;
  form.effectiveFrom = toDateStr(new Date());
};

const load = async () => {
  loading.value = true;
  try {
    const [r, m] = await Promise.all([coinStore.getRules(), coinStore.getMarketItems({})]);
    rules.value = r;
    items.value = m ?? [];
    resetForm();
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const current = computed(() => rules.value?.current ?? null);
const next = computed(() => rules.value?.next ?? null);
const isToday = (date: string) => toDateStr(new Date(date)) === toDateStr(new Date());
const changed = computed(
  () => !!current.value && (form.stepsPerCoin !== current.value.stepsPerCoin || form.maxDailyCoins !== current.value.maxDailyCoins),
);

// ── Ta'sir (oxirgi 30 kun haqiqiy qadamlari) — faqat qiymat o'zgarganda ──
const preview = ref<CoinRulePreviewDto | null>(null);
let previewTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [form.stepsPerCoin, form.maxDailyCoins],
  () => {
    clearTimeout(previewTimer);
    if (!changed.value || !form.stepsPerCoin || !form.maxDailyCoins) return;
    previewTimer = setTimeout(async () => {
      preview.value = await coinStore.previewRule(form.stepsPerCoin, form.maxDailyCoins, 30);
    }, 350);
  },
);

const IMPACT: { label: string; pick: (x: CoinRuleImpactDto) => number; pct?: boolean }[] = [
  { label: "Kuniga jami coin", pick: (x) => x.coinsPerDay },
  { label: "Faol kunda o'rtacha", pick: (x) => x.avgCoinsPerEarningDay },
  { label: "Limitga yetgan kunlar", pick: (x) => x.cappedShare, pct: true },
];
const fmt = (v: number, pct?: boolean) => (pct ? formatPercent(v) : formatDecimal(v));

const tariffs = computed(() => items.value.filter((x) => x.visibleInApp).sort((a, b) => a.rewardValue - b.rewardValue));
const daysToEarn = (price: number, perDay?: number) => (perDay && perDay > 0 ? Math.ceil(price / perDay) : "—");

// ── Saqlash / o'chirish ──────────────────────────────────────────────
const disabledDate = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

const save = async () => {
  const when = isToday(form.effectiveFrom) ? "Bugundan" : `${formatDayYear(form.effectiveFrom)} dan`;
  try {
    await ElMessageBox.confirm(
      `${when}: ${formatNumber(form.stepsPerCoin)} qadam = 1 coin, kuniga ≤ ${form.maxDailyCoins}. O'tgan kunlar o'zgarmaydi.`,
      "Qoidani saqlash",
      { confirmButtonText: "Saqlash", cancelButtonText: "Bekor", type: "warning" },
    );
  } catch {
    return;
  }
  saving.value = true;
  try {
    const res = await coinStore.saveRule({ stepsPerCoin: form.stepsPerCoin, maxDailyCoins: form.maxDailyCoins, effectiveFrom: form.effectiveFrom });
    if (res) {
      rules.value = res;
      resetForm();
      preview.value = null;
      ElMessage.success("Saqlandi");
    }
  } catch (e) {
    ElMessage.error(apiErrorMessage(e));
  } finally {
    saving.value = false;
  }
};

const removeRule = async (rule: CoinRuleDto) => {
  if (!rule.id) return;
  try {
    await ElMessageBox.confirm(`${formatDayYear(rule.effectiveFrom)} dagi qoida o'chiriladi.`, "O'chirish", {
      confirmButtonText: "O'chirish",
      cancelButtonText: "Bekor",
      type: "warning",
    });
  } catch {
    return;
  }
  try {
    const res = await coinStore.deleteRule(rule.id);
    if (res) {
      rules.value = res;
      resetForm();
      ElMessage.success("O'chirildi");
    }
  } catch (e) {
    ElMessage.error(apiErrorMessage(e, "O'chirib bo'lmadi"));
  }
};

const editRule = (rule: CoinRuleDto) => {
  form.stepsPerCoin = rule.stepsPerCoin;
  form.maxDailyCoins = rule.maxDailyCoins;
  form.effectiveFrom = toDateStr(new Date(rule.effectiveFrom));
};

const onEarnStartChanged = async () => {
  rules.value = await coinStore.getRules();
};

const STATUS: Record<string, { label: string; cls: string }> = {
  Current: { label: "Amalda", cls: "c-green" },
  Upcoming: { label: "Rejada", cls: "c-blue" },
  Past: { label: "Tugagan", cls: "c-gray" },
};

const rangeText = (r: CoinRuleDto) =>
  r.effectiveTo ? `${formatDay(r.effectiveFrom)} – ${formatDayYear(r.effectiveTo)}` : `${formatDayYear(r.effectiveFrom)} dan`;
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1 class="page-title">Coin sozlamalari</h1>
    </header>

    <CoinEarnStartCard @changed="onEarnStartChanged" />

    <div v-if="loading && !rules" class="app-card box-pad"><ElSkeleton :rows="4" animated /></div>

    <template v-else-if="rules && current">
      <section class="app-card box-pad rule-card">
        <div>
          <span class="kpi-label">Qadam → coin</span>
          <p class="rule-text">
            <b>{{ formatNumber(current.stepsPerCoin) }}</b> qadam = <b class="coin">1 coin</b>
            <span class="faint">· kuniga ≤ {{ current.maxDailyCoins }}</span>
          </p>
          <p v-if="next" class="next">
            <span class="chip c-blue">{{ formatDay(next.effectiveFrom) }} dan</span>
            {{ formatNumber(next.stepsPerCoin) }} qadam, kuniga {{ next.maxDailyCoins }}
            <button class="link-danger" @click="removeRule(next)">bekor qilish</button>
          </p>
        </div>

        <div class="rule-form">
          <div class="field">
            <label>Qadam = 1 coin</label>
            <ElInputNumber v-model="form.stepsPerCoin" :min="1" :max="100000" :step="100" controls-position="right" />
          </div>
          <div class="field">
            <label>Kunlik limit</label>
            <ElInputNumber v-model="form.maxDailyCoins" :min="1" :max="1000" controls-position="right" />
          </div>
          <div class="field">
            <label>Qaysi kundan</label>
            <ElDatePicker
              v-model="form.effectiveFrom"
              type="date"
              format="DD.MM.YYYY"
              value-format="YYYY-MM-DD"
              :clearable="false"
              :editable="false"
              :disabled-date="disabledDate"
            />
          </div>
          <ElButton type="primary" :loading="saving" :disabled="!changed && isToday(form.effectiveFrom)" @click="save">
            Saqlash
          </ElButton>
        </div>

        <div v-if="changed && preview" class="impact">
          <table class="tbl">
            <thead>
              <tr>
                <th>Oxirgi 30 kun bo'yicha</th>
                <th class="num">Hozir</th>
                <th class="num">Yangi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in IMPACT" :key="row.label">
                <td>{{ row.label }}</td>
                <td class="num faint">{{ fmt(row.pick(preview.current), row.pct) }}</td>
                <td class="num strong">{{ fmt(row.pick(preview.proposed), row.pct) }}</td>
              </tr>
              <tr v-for="t in tariffs" :key="t.id">
                <td>{{ marketItemLabel(t) }} <span class="faint">({{ formatNumber(t.priceCoins) }})</span></td>
                <td class="num faint">~{{ daysToEarn(t.priceCoins, preview.current.avgCoinsPerEarningDay) }} kun</td>
                <td class="num strong">~{{ daysToEarn(t.priceCoins, preview.proposed.avgCoinsPerEarningDay) }} kun</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="app-card box">
        <div class="box-head"><h2 class="box-title">Qoidalar tarixi</h2></div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Davr</th>
                <th class="num">Qadam</th>
                <th class="num">Limit</th>
                <th class="hide-sm">Kim</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rules.history" :key="r.id ?? 'default'">
                <td>
                  <span class="nowrap">{{ rangeText(r) }}</span>
                  <span class="chip" :class="STATUS[r.status]?.cls">{{ STATUS[r.status]?.label }}</span>
                </td>
                <td class="num">{{ formatNumber(r.stepsPerCoin) }}</td>
                <td class="num">{{ r.maxDailyCoins }}</td>
                <td class="hide-sm faint">{{ r.isDefault ? "Boshlang'ich" : r.createdBy || "—" }}</td>
                <td class="num nowrap">
                  <template v-if="r.editable && r.id">
                    <ElButton size="small" text @click="editRule(r)">Tahrir</ElButton>
                    <ElButton size="small" text type="danger" @click="removeRule(r)">O'chirish</ElButton>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped src="./admin.css"></style>
<style scoped>
.rule-card { display: flex; flex-direction: column; gap: 14px; }
.rule-text { font-size: 20px; font-weight: 700; color: var(--text); margin-top: 2px; }
.rule-text b { font-weight: 800; }
.rule-text .faint { font-size: 14px; font-weight: 500; }
.next { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 6px; font-size: 13px; color: var(--text-muted); }
.link-danger { color: var(--danger); font-weight: 600; font-size: 12.5px; }
.rule-form { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid var(--border); }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 12px; font-weight: 600; color: var(--text-faint); }
.field :deep(.el-input-number) { width: 150px; }
.field :deep(.el-date-editor.el-input) { width: 160px; }
.impact { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.tbl td .chip { margin-left: 6px; }
@media (max-width: 640px) {
  .rule-text { font-size: 17px; }
  .rule-form { display: grid; grid-template-columns: 1fr 1fr; }
  .field :deep(.el-input-number), .field :deep(.el-date-editor.el-input) { width: 100%; }
}
</style>
