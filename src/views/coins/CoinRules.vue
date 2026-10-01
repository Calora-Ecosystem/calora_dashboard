<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElSkeleton,
} from "element-plus";
import { useCoinStore } from "../../stores/coinStore";
import type {
  AdminMarketItemDto,
  CoinRuleDto,
  CoinRuleImpactDto,
  CoinRulePreviewDto,
  CoinRulesDto,
} from "../../@types/coin";
import {
  apiErrorMessage,
  formatDayYear,
  formatDecimal,
  formatNumber,
  formatPercent,
  marketItemLabel,
  toDateStr,
} from "./coinMeta";
import CoinEarnStartCard from "./CoinEarnStartCard.vue";

const coinStore = useCoinStore();

const rules = ref<CoinRulesDto | null>(null);
const loading = ref(true);
const saving = ref(false);
const items = ref<AdminMarketItemDto[]>([]);

const STEP_PRESETS = [500, 1000, 1500, 2000, 3000];
const LIMIT_PRESETS = [10, 15, 22, 30, 50];

const form = reactive({
  stepsPerCoin: 1000,
  maxDailyCoins: 22,
  effectiveFrom: toDateStr(new Date()),
  note: "",
});

const resetForm = () => {
  const c = rules.value?.current;
  if (!c) return;
  form.stepsPerCoin = c.stepsPerCoin;
  form.maxDailyCoins = c.maxDailyCoins;
  form.effectiveFrom = toDateStr(new Date());
  form.note = "";
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

// Hisoblash kuni yoki reset — qoidalar tarixidagi "ishga tushgan kun" va ta'sir jadvali yangilanadi.
const onEarnStartChanged = async () => {
  rules.value = await coinStore.getRules();
  loadPreview();
};

const current = computed(() => rules.value?.current ?? null);
const next = computed(() => rules.value?.next ?? null);

const isToday = (date: string) => toDateStr(new Date(date)) === toDateStr(new Date());
const changed = computed(
  () =>
    !!current.value &&
    (form.stepsPerCoin !== current.value.stepsPerCoin ||
      form.maxDailyCoins !== current.value.maxDailyCoins),
);

// Qoida bilan kuniga yig'iladigan coinni kunlik limitgacha qancha qadam bilan olish mumkin.
const stepsForCap = computed(() => form.stepsPerCoin * form.maxDailyCoins);

// ── Ta'sir simulyatsiyasi (oxirgi 30 kun haqiqiy qadamlari) ──────────
const preview = ref<CoinRulePreviewDto | null>(null);
const previewLoading = ref(false);
let previewTimer: ReturnType<typeof setTimeout> | undefined;

const loadPreview = () => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    if (!form.stepsPerCoin || !form.maxDailyCoins) return;
    previewLoading.value = true;
    try {
      preview.value = await coinStore.previewRule(form.stepsPerCoin, form.maxDailyCoins, 30);
    } finally {
      previewLoading.value = false;
    }
  }, 350);
};

watch(() => [form.stepsPerCoin, form.maxDailyCoins], loadPreview);
watch(rules, (r) => r && loadPreview(), { once: true });

const delta = (a: number, b: number) => {
  if (!a) return b ? null : 0;
  return (b - a) / a;
};

type ImpactRow = { label: string; hint: string; pick: (x: CoinRuleImpactDto) => number; kind: "num" | "pct" | "dec" };
const IMPACT_ROWS: ImpactRow[] = [
  { label: "Kuniga jami coin", hint: "barcha userlarga bir kunda", pick: (x) => x.coinsPerDay, kind: "dec" },
  { label: "30 kunda jami", hint: "coin muomalaga chiqadi", pick: (x) => x.totalCoins, kind: "num" },
  { label: "Faol kunda o'rtacha", hint: "≥1 coin olgan user-kun", pick: (x) => x.avgCoinsPerEarningDay, kind: "dec" },
  { label: "Coin oladigan kunlar", hint: "qadam yozilgan kunlardan", pick: (x) => x.earningShare, kind: "pct" },
  { label: "Limitga yetadigan kunlar", hint: "kunlik limit to'lgan", pick: (x) => x.cappedShare, kind: "pct" },
];

const fmtImpact = (v: number, kind: ImpactRow["kind"]) =>
  kind === "pct" ? formatPercent(v) : kind === "dec" ? formatDecimal(v) : formatNumber(v);

// Tariflar: faol user necha kunda yig'adi (hozir va yangi qoida bilan).
const tariffs = computed(() =>
  items.value
    .filter((x) => x.visibleInApp)
    .sort((a, b) => a.rewardValue - b.rewardValue),
);
const daysToEarn = (price: number, perDay: number | undefined) =>
  perDay && perDay > 0 ? Math.ceil(price / perDay) : null;

// ── Saqlash ──────────────────────────────────────────────────────────
const disabledDate = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

const save = async () => {
  if (!form.stepsPerCoin || !form.maxDailyCoins) return;
  const when = isToday(form.effectiveFrom) ? "bugundan" : `${formatDayYear(form.effectiveFrom)} dan`;
  try {
    await ElMessageBox.confirm(
      `${when} boshlab: ${formatNumber(form.stepsPerCoin)} qadam = 1 coin, kuniga ko'pi bilan ${form.maxDailyCoins} coin. ` +
        `O'tgan kunlar eski qoida bilan qoladi. Mobile ilovada hamyon ochilganda yangi qoida ko'rinadi.`,
      "Qoidani saqlash",
      { confirmButtonText: "Saqlash", cancelButtonText: "Bekor qilish", type: "warning" },
    );
  } catch {
    return;
  }

  saving.value = true;
  try {
    const res = await coinStore.saveRule({
      stepsPerCoin: form.stepsPerCoin,
      maxDailyCoins: form.maxDailyCoins,
      effectiveFrom: form.effectiveFrom,
      note: form.note.trim() || undefined,
    });
    if (res) {
      rules.value = res;
      resetForm();
      loadPreview();
      ElMessage.success("Qoida saqlandi");
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
    await ElMessageBox.confirm(
      `${formatDayYear(rule.effectiveFrom)} dan kuchga kiradigan qoida (${formatNumber(rule.stepsPerCoin)} qadam = 1 coin) o'chiriladi — undan oldingi qoida davom etadi.`,
      "Qoidani o'chirish",
      { confirmButtonText: "O'chirish", cancelButtonText: "Bekor qilish", type: "warning" },
    );
  } catch {
    return;
  }
  try {
    const res = await coinStore.deleteRule(rule.id);
    if (res) {
      rules.value = res;
      resetForm();
      loadPreview();
      ElMessage.success("Qoida o'chirildi");
    }
  } catch (e) {
    ElMessage.error(apiErrorMessage(e, "O'chirib bo'lmadi"));
  }
};

const editRule = (rule: CoinRuleDto) => {
  form.stepsPerCoin = rule.stepsPerCoin;
  form.maxDailyCoins = rule.maxDailyCoins;
  form.effectiveFrom = toDateStr(new Date(rule.effectiveFrom));
  form.note = rule.note ?? "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  Current: { label: "Amalda", cls: "st-current" },
  Upcoming: { label: "Rejada", cls: "st-upcoming" },
  Past: { label: "Tugagan", cls: "st-past" },
};

const rangeText = (r: CoinRuleDto) =>
  r.effectiveTo
    ? `${formatDayYear(r.effectiveFrom)} – ${formatDayYear(r.effectiveTo)}`
    : `${formatDayYear(r.effectiveFrom)} dan`;
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">
          <svg-icon icon="navbar/trophy.svg" class="title-icon" />
          Coin sozlamalari
        </h1>
        <p class="page-sub">
          Coin qaysi kundan hisoblanishi, barcha coinlarni o'chirish va necha qadam uchun 1 coin berilishi — mobile ilovadagi hamyon shu sozlamalar bo'yicha ishlaydi
        </p>
      </div>
    </header>

    <div v-if="loading && !rules" class="app-card p-6"><ElSkeleton :rows="6" animated /></div>

    <template v-else-if="rules && current">
      <CoinEarnStartCard @changed="onEarnStartChanged" />

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
        <!-- Chap: joriy qoida + forma -->
        <div class="flex flex-col gap-4 min-w-0">
          <section class="app-card hero">
            <div class="hero-main">
              <span class="hero-label">Hozir amalda</span>
              <p class="hero-rule">
                <b>{{ formatNumber(current.stepsPerCoin) }}</b> qadam = <b class="coin">1 coin</b>
              </p>
              <p class="hero-sub">
                Kuniga ko'pi bilan <b>{{ current.maxDailyCoins }}</b> coin
                · limit {{ formatNumber(current.stepsPerCoin * current.maxDailyCoins) }} qadamda to'ladi
              </p>
              <p class="hero-meta">
                {{ formatDayYear(current.effectiveFrom) }} dan
                <template v-if="current.isDefault"> · boshlang'ich sozlama</template>
                <template v-else-if="current.createdBy"> · {{ current.createdBy }}</template>
              </p>
            </div>
            <div v-if="next" class="next-box">
              <span class="next-label">Rejada · {{ formatDayYear(next.effectiveFrom) }} dan</span>
              <span class="next-rule">{{ formatNumber(next.stepsPerCoin) }} qadam = 1 coin, kuniga {{ next.maxDailyCoins }}</span>
              <div class="flex gap-2 mt-1">
                <ElButton size="small" plain @click="editRule(next)">Tahrirlash</ElButton>
                <ElButton size="small" plain type="danger" @click="removeRule(next)">Bekor qilish</ElButton>
              </div>
            </div>
          </section>

          <section class="app-card form-card">
            <h2 class="section-title">Yangi qoida</h2>
            <p class="section-sub">
              Qoida tanlangan kundan boshlab amal qiladi. O'tgan kunlar o'z qoidasi bilan qoladi — userlarga orqaga qarab coin qo'shilmaydi va olinmaydi.
            </p>

            <div class="form-grid">
              <div class="field">
                <label class="field-label">Necha qadam = 1 coin</label>
                <ElInputNumber
                  v-model="form.stepsPerCoin"
                  :min="1"
                  :max="100000"
                  :step="100"
                  controls-position="right"
                  class="w-full"
                />
                <div class="chips">
                  <button
                    v-for="p in STEP_PRESETS"
                    :key="p"
                    class="chip"
                    :class="{ active: form.stepsPerCoin === p }"
                    @click="form.stepsPerCoin = p"
                  >{{ formatNumber(p) }}</button>
                </div>
              </div>

              <div class="field">
                <label class="field-label">Kunlik limit (coin)</label>
                <ElInputNumber
                  v-model="form.maxDailyCoins"
                  :min="1"
                  :max="1000"
                  controls-position="right"
                  class="w-full"
                />
                <div class="chips">
                  <button
                    v-for="p in LIMIT_PRESETS"
                    :key="p"
                    class="chip"
                    :class="{ active: form.maxDailyCoins === p }"
                    @click="form.maxDailyCoins = p"
                  >{{ p }}</button>
                </div>
              </div>

              <div class="field">
                <label class="field-label">Kuchga kirish kuni</label>
                <ElDatePicker
                  v-model="form.effectiveFrom"
                  type="date"
                  format="DD.MM.YYYY"
                  value-format="YYYY-MM-DD"
                  :clearable="false"
                  :disabled-date="disabledDate"
                  class="w-full"
                />
                <span class="field-hint">
                  {{ isToday(form.effectiveFrom) ? "Bugundan — bugungi qadamlar ham yangi qoida bilan hisoblanadi" : "Shu kungacha joriy qoida davom etadi" }}
                </span>
              </div>

              <div class="field">
                <label class="field-label">Izoh (ixtiyoriy)</label>
                <ElInput v-model="form.note" maxlength="300" placeholder="Masalan: oktabr aksiyasi" />
              </div>
            </div>

            <div class="summary-line">
              <span>
                <b>{{ formatNumber(form.stepsPerCoin) }}</b> qadam = 1 coin ·
                kuniga ≤ <b>{{ form.maxDailyCoins }}</b> coin ·
                limit <b>{{ formatNumber(stepsForCap) }}</b> qadamda to'ladi
              </span>
              <div class="flex gap-2">
                <ElButton :disabled="!changed && isToday(form.effectiveFrom)" @click="resetForm">Qaytarish</ElButton>
                <ElButton type="primary" :loading="saving" @click="save">Saqlash</ElButton>
              </div>
            </div>
          </section>

          <!-- Ta'sir -->
          <section class="app-card impact-card" v-loading="previewLoading && !preview">
            <div class="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h2 class="section-title">Iqtisodiy ta'sir</h2>
                <p class="section-sub" v-if="preview">
                  Oxirgi {{ preview.days }} kun ({{ formatDayYear(preview.from) }} – {{ formatDayYear(preview.to) }}) haqiqiy qadamlari:
                  {{ formatNumber(preview.walkers) }} user, {{ formatNumber(preview.walkerDays) }} user-kun,
                  kunlik o'rtacha {{ formatNumber(preview.avgDailySteps) }} qadam (mediana {{ formatNumber(preview.medianDailySteps) }})
                </p>
              </div>
              <span v-if="previewLoading" class="faint text-[12px]">hisoblanmoqda…</span>
            </div>

            <table v-if="preview" class="impact">
              <thead>
                <tr>
                  <th></th>
                  <th class="num">Hozirgi<br /><small>{{ formatNumber(preview.current.stepsPerCoin) }} / {{ preview.current.maxDailyCoins }}</small></th>
                  <th class="num">Yangi<br /><small>{{ formatNumber(preview.proposed.stepsPerCoin) }} / {{ preview.proposed.maxDailyCoins }}</small></th>
                  <th class="num">Farq</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in IMPACT_ROWS" :key="row.label">
                  <td>
                    <span class="row-label">{{ row.label }}</span>
                    <span class="row-hint">{{ row.hint }}</span>
                  </td>
                  <td class="num">{{ fmtImpact(row.pick(preview.current), row.kind) }}</td>
                  <td class="num"><b>{{ fmtImpact(row.pick(preview.proposed), row.kind) }}</b></td>
                  <td class="num">
                    <template v-if="row.kind === 'pct'">
                      <span
                        v-if="Math.abs(row.pick(preview.proposed) - row.pick(preview.current)) >= 0.0005"
                        class="delta"
                        :class="row.pick(preview.proposed) > row.pick(preview.current) ? 'up' : 'down'"
                      >
                        {{ row.pick(preview.proposed) > row.pick(preview.current) ? "+" : "−" }}{{ formatDecimal(Math.abs(row.pick(preview.proposed) - row.pick(preview.current)) * 100) }} p.p.
                      </span>
                      <span v-else class="faint">—</span>
                    </template>
                    <template v-else>
                      <span
                        v-if="delta(row.pick(preview.current), row.pick(preview.proposed))"
                        class="delta"
                        :class="(delta(row.pick(preview.current), row.pick(preview.proposed)) ?? 0) > 0 ? 'up' : 'down'"
                      >
                        {{ (delta(row.pick(preview.current), row.pick(preview.proposed)) ?? 0) > 0 ? "+" : "" }}{{ formatPercent(delta(row.pick(preview.current), row.pick(preview.proposed))) }}
                      </span>
                      <span v-else class="faint">—</span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-if="preview && tariffs.length" class="tariff-impact">
              <h3 class="sub-title">Do'kondagi tariflarni faol user necha kunda yig'adi</h3>
              <div class="tariff-rows">
                <div v-for="t in tariffs" :key="t.id" class="tariff-row">
                  <span class="t-name">{{ marketItemLabel(t) }}</span>
                  <span class="t-price">{{ formatNumber(t.priceCoins) }} coin</span>
                  <span class="t-days">
                    ~{{ daysToEarn(t.priceCoins, preview.current.avgCoinsPerEarningDay) ?? "—" }} kun
                    <span class="arrow">→</span>
                    <b>~{{ daysToEarn(t.priceCoins, preview.proposed.avgCoinsPerEarningDay) ?? "—" }} kun</b>
                  </span>
                </div>
              </div>
              <router-link :to="{ name: 'coin_market' }" class="link">Tarif narxlarini o'zgartirish →</router-link>
            </div>
          </section>
        </div>

        <!-- O'ng: mobile ko'rinishi -->
        <aside class="flex flex-col gap-4">
          <section class="app-card phone-card">
            <span class="phone-caption">Mobile ilovada (Hamyon) shunday ko'rinadi</span>
            <div class="phone">
              <div class="banner">
                <span class="banner-chip">Qadam = coin</span>
                <p class="banner-rule">{{ formatNumber(form.stepsPerCoin) }} qadam = 1 coin</p>
                <p class="banner-limit">Kuniga {{ form.maxDailyCoins }} tagacha coin</p>
                <div class="banner-progress">
                  <div class="bp-track"><div class="bp-fill" :style="{ width: '45%' }" /></div>
                  <span>{{ Math.round(form.maxDailyCoins * 0.45) }}/{{ form.maxDailyCoins }}</span>
                </div>
              </div>
              <p class="phone-note">
                Matn ilova tilida (uz/ru/en) chiqadi; raqamlar serverdan olinadi.
                <template v-if="!isToday(form.effectiveFrom)"> Bu qoida {{ formatDayYear(form.effectiveFrom) }} dan ko'rinadi.</template>
              </p>
            </div>
          </section>

          <section class="app-card tips">
            <h3 class="sub-title">Qanday ishlaydi</h3>
            <ul>
              <li>Coin har kuni yurilgan qadam uchun beriladi: <code>min(qadam ÷ N, limit)</code>.</li>
              <li>Har kun <b>o'sha kunda amal qilgan</b> qoida bilan hisoblanadi — tarix buzilmaydi.</li>
              <li>Bugungi qoidani o'zgartirsangiz, bugun allaqachon yozilgan coin kamaymaydi (faqat oshishi mumkin).</li>
              <li>Kelajakdagi qoidani oldindan rejalashtirib qo'yish mumkin — kuni kelganda o'zi kuchga kiradi.</li>
            </ul>
          </section>
        </aside>
      </div>

      <!-- Tarix -->
      <section class="app-card table-card">
        <div class="table-toolbar">
          <div>
            <h2 class="section-title">Qoidalar tarixi</h2>
            <p class="section-sub">Coin {{ formatDayYear(rules.coinsEarnStartDate) }} dan hisoblanadi</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="lb">
            <thead>
              <tr>
                <th>Davr</th>
                <th class="num">Qadam / coin</th>
                <th class="num">Kunlik limit</th>
                <th>Holat</th>
                <th>Izoh</th>
                <th>Kim</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rules.history" :key="r.id ?? 'default'">
                <td class="nowrap"><b>{{ rangeText(r) }}</b></td>
                <td class="num">{{ formatNumber(r.stepsPerCoin) }}</td>
                <td class="num">{{ r.maxDailyCoins }}</td>
                <td><span class="status" :class="STATUS_META[r.status]?.cls">{{ STATUS_META[r.status]?.label ?? r.status }}</span></td>
                <td class="muted">{{ r.isDefault ? "Boshlang'ich sozlama" : r.note || "—" }}</td>
                <td class="muted nowrap">
                  {{ r.createdBy || "—" }}
                  <span v-if="r.createdAt" class="faint"> · {{ formatDayYear(r.createdAt) }}</span>
                </td>
                <td class="actions">
                  <template v-if="r.editable && r.id">
                    <ElButton size="small" text @click="editRule(r)">Tahrirlash</ElButton>
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

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.title-icon { width: 24px; height: 24px; }
.title-icon :deep(svg) { stroke: var(--brand-strong); stroke-width: 2; fill: none; }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; max-width: 760px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text); }
.section-sub { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }
.sub-title { font-size: 13.5px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.faint { color: var(--text-faint); }
.muted { color: var(--text-muted); }
.nowrap { white-space: nowrap; }

/* Hero */
.hero { padding: 20px 22px; display: flex; justify-content: space-between; align-items: center; gap: 18px; flex-wrap: wrap;
  background: linear-gradient(135deg, rgba(var(--brand-rgb), 0.10), var(--surface) 65%); border: 1px solid rgba(var(--brand-rgb), 0.25); }
.hero-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--brand-strong); }
.hero-rule { font-size: 30px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-top: 4px; }
.hero-rule .coin { color: var(--warning); }
.hero-sub { font-size: 13.5px; color: var(--text-muted); margin-top: 2px; }
.hero-meta { font-size: 12px; color: var(--text-faint); margin-top: 6px; }
.next-box { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 12px; background: var(--info-soft); border: 1px solid rgba(46, 144, 250, 0.25); }
.next-label { font-size: 11.5px; font-weight: 700; color: var(--info); text-transform: uppercase; letter-spacing: 0.3px; }
.next-rule { font-size: 14px; font-weight: 700; color: var(--text); }

/* Forma */
.form-card { padding: 20px 22px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 18px; margin-top: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--text-muted); }
.field-hint { font-size: 11.5px; color: var(--text-faint); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--surface-2); border: 1px solid var(--border); transition: all 0.15s; }
.chip:hover { color: var(--text); }
.chip.active { color: var(--brand-strong); border-color: rgba(var(--brand-rgb), 0.5); background: var(--brand-soft); }
.summary-line { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-muted); }
.summary-line b { color: var(--text); }

/* Ta'sir */
.impact-card { padding: 20px 22px; min-height: 120px; }
.impact { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13.5px; }
.impact th { text-align: left; font-size: 11.5px; font-weight: 600; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.3px; padding: 8px 10px; background: var(--surface-2); }
.impact th small { text-transform: none; font-weight: 500; letter-spacing: 0; }
.impact td { padding: 10px; border-top: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.impact .num { text-align: right; }
.row-label { display: block; font-weight: 600; }
.row-hint { display: block; font-size: 11.5px; color: var(--text-faint); }
.delta { font-size: 12px; font-weight: 700; padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
.delta.up { color: var(--warning); background: var(--warning-soft); }
.delta.down { color: var(--info); background: var(--info-soft); }
.tariff-impact { margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--border); }
.tariff-rows { display: flex; flex-direction: column; gap: 6px; }
.tariff-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 14px; align-items: center; padding: 8px 12px; border-radius: 10px; background: var(--surface-2); font-size: 13px; }
.t-name { font-weight: 600; color: var(--text); }
.t-price { color: var(--warning); font-weight: 700; }
.t-days { color: var(--text-muted); white-space: nowrap; }
.t-days b { color: var(--text); }
.arrow { color: var(--text-faint); margin: 0 4px; }
.link { display: inline-block; margin-top: 10px; font-size: 12.5px; font-weight: 600; color: var(--brand-strong); }

/* Telefon */
.phone-card { padding: 18px; }
.phone-caption { font-size: 12px; font-weight: 600; color: var(--text-faint); }
.phone { margin-top: 10px; padding: 14px; border-radius: 24px; background: var(--surface-2); border: 1px solid var(--border); }
.banner { padding: 16px; border-radius: 16px; color: #fff; background: linear-gradient(135deg, #34a853, #7cc243); box-shadow: 0 8px 20px rgba(52, 168, 83, 0.25); }
.banner-chip { display: inline-block; padding: 3px 9px; border-radius: 20px; background: rgba(255, 255, 255, 0.22); font-size: 11px; font-weight: 700; }
.banner-rule { font-size: 20px; font-weight: 800; margin-top: 10px; line-height: 1.25; }
.banner-limit { font-size: 13px; opacity: 0.9; margin-top: 4px; }
.banner-progress { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 12px; font-weight: 700; }
.bp-track { flex: 1; height: 6px; border-radius: 6px; background: rgba(255, 255, 255, 0.3); overflow: hidden; }
.bp-fill { height: 100%; border-radius: 6px; background: #fff; }
.phone-note { font-size: 11.5px; color: var(--text-faint); margin-top: 10px; }
.tips { padding: 18px; }
.tips ul { display: flex; flex-direction: column; gap: 8px; padding-left: 16px; list-style: disc; font-size: 12.5px; color: var(--text-muted); }
.tips code { font-size: 12px; padding: 1px 5px; border-radius: 5px; background: var(--surface-2); color: var(--text); }

/* Tarix jadvali */
.table-card { padding: 0; overflow: hidden; }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 14px 16px; }
.table-wrap { overflow-x: auto; }
.lb { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 760px; }
.lb th { text-align: left; padding: 12px 14px; font-size: 11.5px; font-weight: 600; white-space: nowrap; color: var(--text-faint); background: var(--surface-2); text-transform: uppercase; letter-spacing: 0.3px; }
.lb td { padding: 11px 14px; border-top: 1px solid var(--border); color: var(--text); }
.lb .num, .lb th.num { text-align: right; }
.actions { text-align: right; white-space: nowrap; }
.status { padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.st-current { color: var(--success); background: var(--success-soft); }
.st-upcoming { color: var(--info); background: var(--info-soft); }
.st-past { color: var(--text-faint); background: var(--surface-2); }

@media (max-width: 700px) {
  .page-title { font-size: 19px; }
  .hero-rule { font-size: 24px; }
  .form-grid { grid-template-columns: minmax(0, 1fr); }
  .tariff-row { grid-template-columns: minmax(0, 1fr) auto; }
  .t-days { grid-column: 1 / -1; }
}
</style>
