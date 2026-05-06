<script setup lang="ts">
import {
  ElButton,
  ElInput,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import { useBillingStore, type CheckCouponDto, type CouponDto } from "../../stores/billingStore";
import { formatDate, formatMoney } from "../../utils/FormatHelper";

const billingStore = useBillingStore();
const router = useRouter();

const goToEdit = async (row: CouponDto) => {
  const res = await billingStore.checkCoupon(row.code);
  billingStore.editingCoupon = {
    ...row,
    amount: res.code === 200 ? res.content.amount : 0,
  };
  router.push({ name: "coupon_edit", params: { couponId: row.id } });
};

const tableKey = ref(0);

const toggleActive = async (row: CouponDto) => {
  const label = row.isActive ? "o'chirib qo'yish" : "faollashtirish";
  try {
    await ElMessageBox.confirm(`"${row.code}" kuponini ${label}ni xohlaysizmi?`, "Tasdiqlash", {
      confirmButtonText: "Ha",
      cancelButtonText: "Yo'q",
      type: "warning",
    });
  } catch {
    return;
  }
  const detailRes = await billingStore.getCouponById(row.id);
  if (detailRes.code !== 200) return;
  const c = detailRes.content;
  const res = await billingStore.modifyCoupon({
    id: c.id,
    code: c.code,
    amount: c.amount,
    isActive: !c.isActive,
    oneTime: c.oneTime,
    expireAt: c.expireAt,
    allowedUserIds: c.allowedUserIds,
  });
  if (res.code === 200) tableKey.value++;
};

const checkCode = ref("");
const checkResult = ref<CheckCouponDto | null>(null);
const checkError = ref("");

const handleCheck = async () => {
  checkResult.value = null;
  checkError.value = "";
  try {
    const res = await billingStore.checkCoupon(checkCode.value.trim());
    if (res.code === 200) {
      checkResult.value = res.content;
    } else {
      checkError.value = res.error ?? "Kupon topilmadi";
    }
  } catch {
    checkError.value = "Kupon topilmadi";
  }
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card title="Kupon tekshirish">
      <div class="flex flex-row gap-3 items-start">
        <ElInput
          v-model="checkCode"
          placeholder="Kupon kodi"
          size="large"
          style="max-width: 300px"
          @keyup.enter="handleCheck"
        />
        <ElButton size="large" type="primary" @click="handleCheck">Tekshirish</ElButton>
      </div>
      <div v-if="checkResult" class="mt-3 flex flex-wrap gap-2 items-center text-sm">
        <ElTag type="success">{{ checkCode }}</ElTag>
        <ElTag :type="checkResult.isActive ? 'success' : 'danger'">
          {{ checkResult.isActive ? "Faol" : "Faol emas" }}
        </ElTag>
        <span class="text-gray-500">Chegirma: {{ formatMoney(checkResult.amount / 100) }}</span>
        <span v-if="checkResult.expireAt" class="text-gray-500">
          Muddati: {{ formatDate(checkResult.expireAt) }}
        </span>
      </div>
      <div v-if="checkError" class="mt-3 text-red-500 text-sm">{{ checkError }}</div>
    </Card>

    <Card title="Kuponlar">
      <div class="flex justify-end mb-3">
        <RouterLink :to="{ name: 'coupon_create' }">
          <ElButton size="large" type="primary">Yaratish</ElButton>
        </RouterLink>
      </div>

      <DataTable :key="tableKey" :loader="billingStore.loadCoupons">
        <ElTableColumn label="ID" prop="id" width="70" fixed />
        <ElTableColumn label="Kod" prop="code" fixed />
        <ElTableColumn label="Foydalanishlar" prop="usages" width="140" />
        <ElTableColumn label="Holat" width="120">
          <template #default="{ row }">
            <ElTag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? "Faol" : "Faol emas" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="One-time" width="100">
          <template #default="{ row }">
            <ElTag v-if="row.oneTime" type="warning" size="small">Ha</ElTag>
            <span v-else class="text-gray-400 text-sm">Yo'q</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Muddati">
          <template #default="{ row }">
            <span v-if="row.expireAt">{{ formatDate(row.expireAt) }}</span>
            <span v-else class="text-gray-400">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Yaratilgan">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="Amallar" width="300">
          <template #default="{ row }">
            <div class="flex gap-1 gapy-0 flex-wrap">
              <ElButton size="small" type="primary" @click="goToEdit(row)">Tahrirlash</ElButton>
              <ElButton
                size="small"
                :type="row.isActive ? 'danger' : 'success'"
                @click="toggleActive(row)"
              >
                {{ row.isActive ? "O'chirish" : "Faollashtirish" }}
              </ElButton>
              <RouterLink :to="{ name: 'coupon_usages', params: { couponId: row.id } }">
                <ElButton size="small">Foydalanishlar</ElButton>
              </RouterLink>
            </div>
          </template>
        </ElTableColumn>
      </DataTable>
    </Card>
  </div>
</template>
