<script setup lang="ts">
import {
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElMessage,
  ElSwitch,
  FormInstance,
  FormRules,
} from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "../../stores/appStore";
import {
  useBillingStore,
  type SavePlanExtraDto,
  type SubscriptionPlan,
} from "../../stores/billingStore";
import { formatMoney } from "../../utils/FormatHelper";

const billingStore = useBillingStore();
const appStore = useAppStore();
const router = useRouter();
const route = useRoute();

const planId = route.params.planId ? Number(route.params.planId) : undefined;
const isEdit = computed(() => planId !== undefined);

const plansList: { key: SubscriptionPlan; label: string }[] = [
  { key: "Premium", label: "Premium" },
  { key: "Pro", label: "Pro" },
  { key: "Free", label: "Free" },
];

const data = reactive<SavePlanExtraDto>({
  id: planId,
  plan: "Premium",
  duration: 1,
  fee: 0,
  originalFee: 0,
  isActive: true,
  isPopular: false,
});

const rules = reactive<FormRules<SavePlanExtraDto>>({
  plan: [{ required: true, message: "Tarifni tanlang" }],
  duration: [
    { required: true, message: "Muddat kiritilishi shart" },
    { type: "number", min: 1, message: "Kamida 1 oy" },
  ],
  fee: [
    { required: true, message: "Narx kiritilishi shart" },
    { type: "number", min: 0, message: "Narx manfiy bo'lmasin" },
  ],
  originalFee: [
    { type: "number", min: 0, message: "Narx manfiy bo'lmasin" },
  ],
});

const form = ref<FormInstance>();
const loading = ref(false);

onMounted(async () => {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const plan = await billingStore.getPlanById(planId!);
    if (plan) Object.assign(data, plan);
  } finally {
    loading.value = false;
  }
});

const handleSubmit = async () => {
  try {
    await form.value?.validate();
    await billingStore.savePlan(data);
    ElMessage.success(isEdit.value ? "Tarif yangilandi" : "Tarif qo'shildi");
    router.push({ name: "subscriptions" });
  } catch (e) {}
};
</script>

<template>
  <ElForm ref="form" :rules="rules" :model="data" class="edit-form" @submit.prevent="handleSubmit">
    <!-- Sticky header -->
    <div class="form-header">
      <div class="flex items-center gap-3 min-w-0">
        <button type="button" class="hbtn-back" @click="router.back()">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="min-w-0">
          <h1 class="text-[19px] font-bold truncate" style="color: var(--text)">
            {{ isEdit ? "Tarifni tahrirlash" : "Yangi tarif" }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Obuna paketi narx va muddatini belgilang</p>
        </div>
      </div>
      <button type="button" class="hbtn-save" :disabled="appStore.isLoading" @click="handleSubmit">
        <span v-if="appStore.isLoading" class="spinner"></span>
        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ isEdit ? "Saqlash" : "Qo'shish" }}
      </button>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
      <!-- LEFT -->
      <div class="xl:col-span-2 space-y-5 min-w-0">
        <section class="panel">
          <h2 class="panel-title">Tarif va muddat</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Tarif turi</label>
              <ElFormItem prop="plan" class="!mb-0">
                <div class="seg">
                  <button
                    v-for="p in plansList"
                    :key="p.key"
                    type="button"
                    class="seg-btn"
                    :class="{ 'seg-active': data.plan === p.key }"
                    @click="data.plan = p.key"
                  >{{ p.label }}</button>
                </div>
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Muddat (oy)</label>
              <ElFormItem prop="duration" class="!mb-0">
                <ElInputNumber v-model="data.duration" :min="1" :max="120" size="large" class="w-full" />
              </ElFormItem>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel-title">Narx</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label class="lbl">Joriy narx (UZS)</label>
              <ElFormItem prop="fee" class="!mb-0">
                <ElInputNumber v-model="data.fee" :min="0" :step="1000" :controls="false" size="large" class="w-full" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Asl narx (chegirmagacha)</label>
              <ElFormItem prop="originalFee" class="!mb-0">
                <ElInputNumber v-model="data.originalFee" :min="0" :step="1000" :controls="false" size="large" class="w-full" />
              </ElFormItem>
            </div>
          </div>
          <p v-if="data.originalFee > data.fee" class="mt-3 text-[12.5px]" style="color: var(--brand-strong)">
            Chegirma: {{ formatMoney(data.originalFee - data.fee, "standard") }}
            ({{ Math.round((1 - data.fee / data.originalFee) * 100) }}%)
          </p>
        </section>
      </div>

      <!-- RIGHT -->
      <div class="space-y-5 min-w-0">
        <section class="panel">
          <h2 class="panel-title">Sozlamalar</h2>
          <div class="space-y-4 mt-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <label class="lbl !mb-0.5">Faol</label>
                <p class="text-[11.5px]" style="color: var(--text-faint)">Ilovada ko'rinadi va sotiladi</p>
              </div>
              <ElFormItem prop="isActive" class="!mb-0">
                <ElSwitch v-model="data.isActive" />
              </ElFormItem>
            </div>
            <div class="flex items-center justify-between gap-3">
              <div>
                <label class="lbl !mb-0.5">Mashhur</label>
                <p class="text-[11.5px]" style="color: var(--text-faint)">"Mashhur" belgisi bilan ajratiladi</p>
              </div>
              <ElFormItem prop="isPopular" class="!mb-0">
                <ElSwitch v-model="data.isPopular" />
              </ElFormItem>
            </div>
          </div>
        </section>

        <!-- Live preview -->
        <section class="panel">
          <h2 class="panel-title">Ko'rinish</h2>
          <div class="preview mt-4" :class="{ 'opacity-60': !data.isActive }">
            <div class="flex items-center justify-between">
              <span class="badge" :style="data.plan === 'Pro'
                ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
                : data.plan === 'Premium'
                ? { background: 'var(--brand-soft)', color: 'var(--brand-strong)' }
                : { background: 'var(--surface-2)', color: 'var(--text-muted)' }">{{ data.plan }}</span>
              <span v-if="data.isPopular" class="mini-badge" style="background: var(--warning-soft); color: var(--warning)">★ Mashhur</span>
            </div>
            <div class="mt-2 flex items-baseline gap-1">
              <span class="text-[24px] font-extrabold" style="color: var(--text)">{{ data.duration }}</span>
              <span class="text-[13px] font-semibold" style="color: var(--text-muted)">oy</span>
            </div>
            <div class="mt-1 flex items-baseline gap-2 flex-wrap">
              <span class="text-[16px] font-bold" style="color: var(--brand-strong)">{{ formatMoney(data.fee || 0, "standard") }}</span>
              <span v-if="data.originalFee > data.fee" class="text-[12.5px] line-through" style="color: var(--text-faint)">{{ formatMoney(data.originalFee, "standard") }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </ElForm>
</template>

<style scoped>
.form-header {
  position: sticky;
  top: -28px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}
.hbtn-back {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.hbtn-back:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.hbtn-save {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 6px 16px rgba(var(--brand-rgb), 0.3);
  transition: all 0.18s ease;
}
.hbtn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(var(--brand-rgb), 0.42);
}
.hbtn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.lbl {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 7px;
}
.seg {
  display: flex;
  width: 100%;
  padding: 4px;
  border-radius: 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  gap: 3px;
}
.seg-btn {
  flex: 1;
  padding: 9px 6px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s ease;
}
.seg-btn:hover {
  color: var(--text);
}
.seg-active {
  background: var(--surface);
  color: var(--brand-strong);
  box-shadow: var(--shadow-sm);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.mini-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.preview {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  background: var(--surface-2);
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2.5px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.edit-form :deep(.el-input__wrapper),
.edit-form :deep(.el-input-number) {
  border-radius: 11px;
  width: 100%;
}
</style>
