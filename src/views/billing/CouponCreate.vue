<script setup lang="ts">
import {
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSwitch,
  FormInstance,
  FormRules,
} from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Card from "../../components/ui/Card.vue";
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
      router.push({ name: "coupons" });
    }
  } catch {}
};
</script>

<template>
  <Card :title="isEdit ? 'Kuponni tahrirlash' : 'Yangi kupon'">
    <div class="flex justify-center">
      <ElForm
        ref="form"
        :model="data"
        :rules="rules"
        label-position="top"
        size="large"
        style="width: 420px"
        @submit.prevent="handleSubmit"
      >
        <ElFormItem label="Kod" prop="code" required>
          <ElInput
            v-model="data.code"
            placeholder="Masalan: SUMMER25"
            style="text-transform: uppercase"
          />
        </ElFormItem>

        <ElFormItem label="Chegirma miqdori (UZS)" prop="amount" required>
          <ElInputNumber
            v-model="data.amount"
            :min="1"
            :controls="true"
            style="width: 100%"
          />
        </ElFormItem>

        <div class="flex flex-row gap-6">
          <ElFormItem label="Faol" prop="isActive">
            <ElSwitch v-model="data.isActive" />
          </ElFormItem>
          <ElFormItem label="Bir martalik" prop="oneTime">
            <ElSwitch v-model="data.oneTime" />
          </ElFormItem>
        </div>

        <ElFormItem label="Amal qilish muddati (ixtiyoriy)" prop="expireAt">
          <ElDatePicker
            v-model="data.expireAt"
            type="datetime"
            placeholder="Tanlang"
            style="width: 100%"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </ElFormItem>

        <div class="flex gap-3 mt-2">
          <ElButton @click="router.back()">Bekor qilish</ElButton>
          <ElButton
            type="primary"
            native-type="submit"
            :loading="appStore.isLoading"
          >
            Saqlash
          </ElButton>
        </div>
      </ElForm>
    </div>
  </Card>
</template>
