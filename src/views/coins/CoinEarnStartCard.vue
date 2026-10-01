<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElButton, ElCheckbox, ElDatePicker, ElMessage, ElMessageBox, ElSkeleton } from "element-plus";
import { useCoinStore } from "../../stores/coinStore";
import type { CoinEarnStartDto } from "../../@types/coin";
import { apiErrorMessage, formatDateTime, formatDayYear, formatNumber, toDateStr } from "./coinMeta";

const emit = defineEmits<{ (e: "changed"): void }>();

const coinStore = useCoinStore();
const data = ref<CoinEarnStartDto | null>(null);
const loading = ref(true);
const saving = ref(false);

const date = ref(toDateStr(new Date()));
const resetCoins = ref(false);

const load = async () => {
  loading.value = true;
  try {
    data.value = await coinStore.getEarnStart();
    if (data.value) date.value = toDateStr(new Date(data.value.earnStartDate));
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const dayDiff = (a: string, b: string) =>
  Math.round((new Date(a).setHours(0, 0, 0, 0) - new Date(b).setHours(0, 0, 0, 0)) / 86400000);

const status = computed(() => {
  const d = data.value;
  if (!d) return null;
  const diff = dayDiff(d.earnStartDate, d.today);
  if (diff > 0) return { cls: "c-orange", text: `${diff} kundan keyin boshlanadi` };
  return { cls: "c-green", text: diff === 0 ? "Bugundan yig'ilmoqda" : `${-diff} kundan beri yig'ilmoqda` };
});

const canSave = computed(
  () => !!data.value && (resetCoins.value || date.value !== toDateStr(new Date(data.value.earnStartDate))),
);

const todayStr = toDateStr(new Date());
const isPastDate = computed(() => date.value < todayStr);

const save = async () => {
  const d = data.value;
  if (!d || !canSave.value) return;
  const when = formatDayYear(date.value);

  try {
    if (resetCoins.value) {
      await ElMessageBox.prompt(
        `${formatNumber(d.walletsWithCoins)} ta userning ${formatNumber(d.balance)} coini va ${formatNumber(d.transactions)} ta yozuvi o'chadi. ` +
          `Xaridlar va Premium qoladi. Coin ${when} dan hisoblanadi.\n\nTasdiqlash uchun O'CHIRISH deb yozing.`,
        "Barcha coinlarni o'chirish",
        {
          confirmButtonText: "O'chirish",
          cancelButtonText: "Bekor",
          confirmButtonClass: "el-button--danger",
          inputPlaceholder: "O'CHIRISH",
          inputPattern: /^O'CHIRISH$/,
          inputErrorMessage: "O'CHIRISH deb yozing",
          type: "warning",
          customStyle: { whiteSpace: "pre-line" },
        },
      );
    } else {
      await ElMessageBox.confirm(`Coin ${when} dan hisoblanadi. Mavjud coinlar qoladi.`, "Hisoblash kuni", {
        confirmButtonText: "Saqlash",
        cancelButtonText: "Bekor",
        type: "warning",
      });
    }
  } catch {
    return;
  }

  saving.value = true;
  try {
    const res = await coinStore.saveEarnStart({ earnStartDate: date.value, resetCoins: resetCoins.value });
    if (res) {
      data.value = res;
      date.value = toDateStr(new Date(res.earnStartDate));
      ElMessage.success(resetCoins.value ? "Coinlar o'chirildi" : "Saqlandi");
      resetCoins.value = false;
      emit("changed");
    }
  } catch (e) {
    ElMessage.error(apiErrorMessage(e));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <section class="app-card earn">
    <ElSkeleton v-if="loading && !data" :rows="2" animated />

    <template v-else-if="data">
      <div class="top">
        <div>
          <span class="label">Coin hisoblash kuni</span>
          <p class="date">
            {{ formatDayYear(data.earnStartDate) }}
            <span v-if="status" class="chip" :class="status.cls">{{ status.text }}</span>
          </p>
        </div>
        <div class="stats">
          <span><b>{{ formatNumber(data.walletsWithCoins) }}</b> user</span>
          <span><b class="coin">{{ formatNumber(data.balance) }}</b> coin</span>
          <span class="hide-sm"><b>{{ formatNumber(data.transactions) }}</b> yozuv</span>
        </div>
      </div>

      <p v-if="data.stepCoinsBeforeStart > 0" class="warn">
        Hisoblash kunidan oldingi {{ formatNumber(data.stepCoinsBeforeStart) }} coin hali bor.
      </p>

      <div class="form">
        <ElDatePicker
          v-model="date"
          type="date"
          format="DD.MM.YYYY"
          value-format="YYYY-MM-DD"
          :clearable="false"
          :editable="false"
          class="date-input"
        />
        <ElCheckbox v-model="resetCoins" class="reset">Barcha coinlarni o'chirish</ElCheckbox>
        <ElButton :type="resetCoins ? 'danger' : 'primary'" :disabled="!canSave" :loading="saving" @click="save">
          Saqlash
        </ElButton>
      </div>

      <p v-if="resetCoins && isPastDate" class="warn">
        O'tgan kun tanlangan — {{ formatDayYear(date) }} dan bugungacha coin qayta yoziladi.
      </p>

      <div v-if="data.resets.length" class="resets">
        <div v-for="r in data.resets.slice(0, 3)" :key="r.id" class="reset-row">
          <span class="nowrap">{{ formatDateTime(r.createdAt) }}</span>
          <span class="faint">{{ r.createdBy || "—" }}</span>
          <span class="faint nowrap">−{{ formatNumber(r.balanceRemoved) }} coin · {{ formatNumber(r.usersAffected) }} user</span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped src="./admin.css"></style>
<style scoped>
.earn { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.top { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.label { font-size: 12px; font-weight: 600; color: var(--text-faint); }
.date { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 20px; font-weight: 800; color: var(--text); }
.stats { display: flex; gap: 14px; font-size: 13px; color: var(--text-faint); }
.stats b { color: var(--text); }
.stats b.coin { color: var(--warning); }
.warn { font-size: 12.5px; color: var(--text); padding: 7px 10px; border-radius: 8px; background: var(--warning-soft); }
.form { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border); }
.date-input { width: 160px; }
.form :deep(.el-date-editor.el-input) { width: 160px; }
.reset :deep(.el-checkbox__label) { color: var(--danger); font-weight: 600; }
.resets { display: flex; flex-direction: column; gap: 4px; }
.reset-row { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); }
@media (max-width: 640px) {
  .date { font-size: 17px; }
  .form { display: grid; grid-template-columns: 1fr auto; }
  .form :deep(.el-date-editor.el-input) { width: 100%; }
  .reset { grid-column: 1 / -1; grid-row: 2; }
}
</style>
