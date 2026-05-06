<script setup lang="ts">
import { ElButton, ElTableColumn } from "element-plus";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import { useBillingStore } from "../../stores/billingStore";
import { formatDate, formatMoney } from "../../utils/FormatHelper";

const billingStore = useBillingStore();
const route = useRoute();
const router = useRouter();

const couponId = computed(() => Number(route.params.couponId));

const loader = (skip: number, take: number) =>
  billingStore.getCouponUsages(couponId.value, skip, take);
</script>

<template>
  <Card :title="`Kupon #${couponId} — foydalanishlar`">
    <div class="flex justify-between items-center mb-3">
      <ElButton @click="router.back()">← Orqaga</ElButton>
    </div>

    <DataTable :loader="loader">
      <ElTableColumn label="Order ID" prop="orderId" width="100" />
      <ElTableColumn label="Foydalanuvchi" prop="userName" />
      <ElTableColumn label="Summa">
        <template #default="{ row }">
          {{ formatMoney(row.amount, "standard") }}
        </template>
      </ElTableColumn>
      <ElTableColumn label="Sana">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>
