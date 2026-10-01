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

// Joriy holat: kelajak kun — hali coin yozilmaydi; bugun yoki o'tgan — coin yig'ilmoqda.
const status = computed(() => {
  const d = data.value;
  if (!d) return null;
  const diff = dayDiff(d.earnStartDate, d.today);
  if (diff > 0) return { kind: "waiting", text: `${diff} kundan keyin boshlanadi — hozir hech kimga coin yozilmaydi` };
  if (diff === 0) return { kind: "live", text: "Bugundan boshlab coin yig'ilmoqda" };
  return { kind: "live", text: `${-diff} kundan beri coin yig'ilmoqda` };
});

const changedDate = computed(() => !!data.value && date.value !== toDateStr(new Date(data.value.earnStartDate)));
const canSave = computed(() => changedDate.value || resetCoins.value);

const todayStr = toDateStr(new Date());
const isPastDate = computed(() => date.value < todayStr);
const pastDays = computed(() => (isPastDate.value ? dayDiff(todayStr, date.value) : 0));

const save = async () => {
  const d = data.value;
  if (!d || !canSave.value) return;
  const when = formatDayYear(date.value);

  try {
    if (resetCoins.value) {
      const lines = [
        `${formatNumber(d.walletsWithCoins)} ta userning coin balansi (jami ${formatNumber(d.balance)} coin) va ${formatNumber(d.transactions)} ta coin tarixi yozuvi o'chiriladi.`,
        "Do'kon xaridlari va berilgan Premium o'chirilmaydi.",
        isPastDate.value
          ? `Coin ${when} dan qayta hisoblanadi — o'tgan ${pastDays.value} kun qadamlari uchun coin userlar ilovani ochganda qayta yoziladi.`
          : `Coin ${when} dan boshlab yig'iladi.`,
        "Davom etish uchun O'CHIRISH deb yozing.",
      ];
      await ElMessageBox.prompt(lines.join("\n"), "Barcha coinlarni o'chirish", {
        confirmButtonText: "O'chirish va saqlash",
        cancelButtonText: "Bekor qilish",
        confirmButtonClass: "el-button--danger",
        inputPlaceholder: "O'CHIRISH",
        inputPattern: /^O'CHIRISH$/,
        inputErrorMessage: "O'CHIRISH deb yozing",
        type: "warning",
        customStyle: { whiteSpace: "pre-line" },
      });
    } else {
      await ElMessageBox.confirm(
        isPastDate.value
          ? `Coin hisoblash kuni ${when}. Shu kundan bugungacha qadamlar uchun yetishmayotgan coinlar userlar ilovani ochganda qo'shiladi. Mavjud coinlar o'chirilmaydi.`
          : `Coin hisoblash kuni ${when}. Shu kungacha yangi coin yozilmaydi. Mavjud coinlar o'chirilmaydi.`,
        "Coin hisoblash kunini saqlash",
        { confirmButtonText: "Saqlash", cancelButtonText: "Bekor qilish", type: "warning" },
      );
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
      ElMessage.success(resetCoins.value ? "Coinlar o'chirildi, hisoblash kuni saqlandi" : "Coin hisoblash kuni saqlandi");
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
  <section class="app-card earn-card">
    <div v-if="loading && !data" class="p-2"><ElSkeleton :rows="3" animated /></div>

    <template v-else-if="data">
      <div class="head">
        <div class="min-w-0">
          <span class="label">Coin hisoblash kuni</span>
          <p class="date">{{ formatDayYear(data.earnStartDate) }}</p>
          <p v-if="status" class="status" :class="status.kind">
            <span class="dot" />
            {{ status.text }}
          </p>
          <p class="meta">
            <template v-if="data.isDefault">Boshlang'ich sozlama (hali dashboard'dan o'zgartirilmagan)</template>
            <template v-else>{{ data.updatedBy || "—" }}<template v-if="data.updatedAt"> · {{ formatDateTime(data.updatedAt) }}</template></template>
          </p>
        </div>

        <div class="stats">
          <div class="stat">
            <span class="s-value">{{ formatNumber(data.walletsWithCoins) }}</span>
            <span class="s-label">coini bor user</span>
          </div>
          <div class="stat">
            <span class="s-value coin">{{ formatNumber(data.balance) }}</span>
            <span class="s-label">muomaladagi coin</span>
          </div>
          <div class="stat">
            <span class="s-value">{{ formatNumber(data.transactions) }}</span>
            <span class="s-label">coin tarixi yozuvi</span>
          </div>
        </div>
      </div>

      <p v-if="data.stepCoinsBeforeStart > 0" class="warn">
        Hisoblash kunidan oldingi kunlar uchun {{ formatNumber(data.stepCoinsBeforeStart) }} coin yozilgan
        <template v-if="data.earliestStepDay">({{ formatDayYear(data.earliestStepDay) }} dan)</template>
        — ularni olib tashlash uchun "coinlarni o'chirish" bilan saqlang.
      </p>

      <div class="form">
        <div class="field">
          <label class="field-label">Yangi hisoblash kuni</label>
          <ElDatePicker
            v-model="date"
            type="date"
            format="DD.MM.YYYY"
            value-format="YYYY-MM-DD"
            :clearable="false"
            class="w-full"
          />
        </div>
        <div class="field grow">
          <ElCheckbox v-model="resetCoins" class="reset-check">
            Barcha userlarning coin balansi va coin tarixini o'chirish (hamyonlar 0)
          </ElCheckbox>
          <span class="field-hint">Do'kon xaridlari va berilgan Premium o'chirilmaydi.</span>
        </div>
        <ElButton
          :type="resetCoins ? 'danger' : 'primary'"
          :disabled="!canSave"
          :loading="saving"
          @click="save"
        >
          {{ resetCoins ? "O'chirish va saqlash" : "Saqlash" }}
        </ElButton>
      </div>

      <p v-if="resetCoins && isPastDate" class="warn">
        Tanlangan kun o'tgan kun: o'chirilgandan keyin {{ formatDayYear(date) }} dan bugungacha ({{ pastDays }} kun) qadamlar uchun
        coin qayta yoziladi. To'liq noldan boshlash uchun bugungi yoki kelajakdagi kunni tanlang.
      </p>
      <p v-else-if="!resetCoins" class="hint">
        Kelajakdagi kunni tanlasangiz, o'sha kungacha hech kimga coin yozilmaydi va kuni kelganda o'zi boshlanadi
        (masalan, ilova release bo'ladigan kun).
      </p>

      <div v-if="data.resets.length" class="resets">
        <span class="sub-title">O'chirishlar tarixi</span>
        <div v-for="r in data.resets" :key="r.id" class="reset-row">
          <span class="nowrap"><b>{{ formatDateTime(r.createdAt) }}</b></span>
          <span>{{ r.createdBy || "—" }}</span>
          <span>{{ formatNumber(r.usersAffected) }} user · {{ formatNumber(r.balanceRemoved) }} coin · {{ formatNumber(r.transactionsRemoved) }} yozuv</span>
          <span class="faint nowrap">hisoblash kuni {{ formatDayYear(r.earnStartDate) }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.earn-card { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; flex-wrap: wrap; }
.label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); }
.date { font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-top: 2px; }
.status { display: inline-flex; align-items: center; gap: 7px; margin-top: 6px; padding: 4px 11px; border-radius: 999px; font-size: 12.5px; font-weight: 600; }
.status .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.status.live { color: var(--success); background: var(--success-soft); }
.status.waiting { color: var(--warning); background: var(--warning-soft); }
.meta { font-size: 12px; color: var(--text-faint); margin-top: 6px; }
.stats { display: flex; gap: 10px; flex-wrap: wrap; }
.stat { display: flex; flex-direction: column; padding: 10px 14px; border-radius: 12px; background: var(--surface-2); min-width: 120px; }
.s-value { font-size: 20px; font-weight: 800; color: var(--text); }
.s-value.coin { color: var(--warning); }
.s-label { font-size: 11.5px; color: var(--text-faint); }
.warn { font-size: 12.5px; color: var(--text); padding: 9px 12px; border-radius: 10px; background: var(--warning-soft); border: 1px solid rgba(247, 144, 9, 0.3); }
.hint { font-size: 12px; color: var(--text-faint); }
.form { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid var(--border); }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 200px; }
.field.grow { flex: 1; min-width: 260px; }
.field-label { font-size: 12.5px; font-weight: 600; color: var(--text-muted); }
.field-hint { font-size: 11.5px; color: var(--text-faint); padding-left: 24px; }
.reset-check :deep(.el-checkbox__label) { white-space: normal; font-weight: 600; color: var(--danger); }
.resets { display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px dashed var(--border); }
.sub-title { font-size: 13px; font-weight: 700; color: var(--text); }
.reset-row { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: 14px; align-items: center; font-size: 12.5px; color: var(--text-muted); padding: 7px 10px; border-radius: 9px; background: var(--surface-2); }
.reset-row b { color: var(--text); }
.faint { color: var(--text-faint); }
.nowrap { white-space: nowrap; }

@media (max-width: 700px) {
  .date { font-size: 22px; }
  .reset-row { grid-template-columns: minmax(0, 1fr); gap: 2px; }
}
</style>
