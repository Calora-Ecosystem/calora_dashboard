<script setup lang="ts">
import { ElTableColumn } from "element-plus";
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
  <Card :title="`Kupon #${couponId}`" subtitle="Ushbu kupon bo'yicha foydalanishlar">
    <template #actions>
      <button class="btn-ghost" @click="router.back()">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Orqaga
      </button>
    </template>

    <DataTable :loader="loader">
      <ElTableColumn label="Order ID" prop="orderId" width="110" />
      <ElTableColumn label="Foydalanuvchi" min-width="200">
        <template #default="{ row }">
          <span class="font-semibold" style="color: var(--text)">{{ row.userName ?? "—" }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Summa" min-width="140">
        <template #default="{ row }">
          <span class="badge" style="background: var(--brand-soft); color: var(--brand-strong)">
            {{ formatMoney(row.amount, "standard") }}
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Sana" min-width="160">
        <template #default="{ row }">
          <span style="color: var(--text-muted)">{{ formatDate(row.createdAt) }}</span>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>

<style scoped>
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.btn-ghost:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
</style>
