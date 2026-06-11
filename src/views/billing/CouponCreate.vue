<script setup lang="ts">
import {
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSwitch,
  FormInstance,
  FormRules,
} from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "../../stores/appStore";
import { useBillingStore, type CreateCouponDto } from "../../stores/billingStore";

const billingStore = useBillingStore();
const appStore = useAppStore();
const router = useRouter();
const route = useRoute();

const couponId = route.params.couponId ? Number(route.params.couponId) : undefined;
const isEdit = couponId !== undefined;

const data = reactive<CreateCouponDto>({
  id: couponId,
  code: "",
  amount: 1,
  isActive: true,
  oneTime: false,
  expireAt: null,
  allowedUserIds: null,
});

const rules = reactive<FormRules<CreateCouponDto>>({
  code: [
    { required: true, message: "Kod kiritilishi shart" },
    { min: 2, message: "Kamida 2 ta belgi" },
  ],
  amount: [
    { required: true, message: "Miqdor kiritilishi shart" },
    { type: "number", min: 1, message: "Kamida 1 bo'lishi kerak" },
  ],
});

const form = ref<FormInstance>();

onMounted(() => {
  if (!isEdit) return;
  const c = billingStore.editingCoupon;
  if (!c) return;
  data.code = c.code;
  data.amount = c.amount / 100;
  data.isActive = c.isActive;
  data.oneTime = c.oneTime;
  data.expireAt = c.expireAt;
  data.allowedUserIds = c.allowedUserIds;
});

const handleSubmit = async () => {
  try {
    await form.value?.validate();
    const res = await billingStore.modifyCoupon({ ...data, amount: data.amount * 100 });
    if (res.code === 200) {
      ElMessage.success(isEdit ? "Kupon yangilandi" : "Kupon qo'shildi");
      router.push({ name: "coupons" });
    }
  } catch {}
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
            {{ isEdit ? "Kuponni tahrirlash" : "Yangi kupon" }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Chegirma kupon ma'lumotlarini to'ldiring</p>
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
          <h2 class="panel-title">Kupon ma'lumotlari</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Kod</label>
              <ElFormItem prop="code" class="!mb-0">
                <ElInput v-model="data.code" placeholder="Masalan: SUMMER25" size="large" style="text-transform: uppercase" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Chegirma miqdori (UZS)</label>
              <ElFormItem prop="amount" class="!mb-0">
                <ElInputNumber v-model="data.amount" :min="1" :controls="true" size="large" class="w-full" />
              </ElFormItem>
            </div>
          </div>
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
                <p class="text-[11.5px]" style="color: var(--text-faint)">Kupon ishlatilishi mumkin</p>
              </div>
              <ElFormItem prop="isActive" class="!mb-0">
                <ElSwitch v-model="data.isActive" />
              </ElFormItem>
            </div>
            <div class="flex items-center justify-between gap-3">
              <div>
                <label class="lbl !mb-0.5">Bir martalik</label>
                <p class="text-[11.5px]" style="color: var(--text-faint)">Har foydalanuvchi bir marta</p>
              </div>
              <ElFormItem prop="oneTime" class="!mb-0">
                <ElSwitch v-model="data.oneTime" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Amal qilish muddati (ixtiyoriy)</label>
              <ElFormItem prop="expireAt" class="!mb-0">
                <ElDatePicker
                  v-model="data.expireAt"
                  type="datetime"
                  placeholder="Tanlang"
                  class="w-full"
                  value-format="YYYY-MM-DDTHH:mm:ss"
                />
              </ElFormItem>
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
.edit-form :deep(.el-textarea__inner),
.edit-form :deep(.el-select__wrapper),
.edit-form :deep(.el-date-editor.el-input__wrapper) {
  border-radius: 11px;
}
.edit-form :deep(.el-input-number),
.edit-form :deep(.el-date-editor) {
  width: 100%;
}
</style>
