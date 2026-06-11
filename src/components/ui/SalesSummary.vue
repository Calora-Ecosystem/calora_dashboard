<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import SummaryCard from "../shared/SummaryCard.vue";
import { formatMoney } from "../../utils/FormatHelper";

const dashboardStore = useDashboardStore();

onMounted(async () => {
  await dashboardStore.loadOverallSummary();
});

const s = computed(() => dashboardStore.overallSummary);

const avgCheck = computed(() => {
  const amount = s.value?.totalSalesAmount ?? 0;
  const count = s.value?.totalSalesCount ?? 0;
  return count ? amount / count : 0;
});
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
    <SummaryCard
      glyph="users"
      tone="brand"
      total-text="Jami foydalanuvchilar"
      :total="(s?.totalUsers ?? 0).toLocaleString()"
      :percent="s?.totalUsersGrows"
      url="/users"
    />
    <SummaryCard
      glyph="sales"
      tone="info"
      total-text="Jami savdolar soni"
      :total="(s?.totalSalesCount ?? 0).toLocaleString()"
      :percent="s?.totalSalesCountGrows"
      url="/sales"
    />
    <SummaryCard
      glyph="money"
      tone="purple"
      total-text="Jami tushum"
      :total="formatMoney(s?.totalSalesAmount)"
      :percent="s?.totalSalesAmountGrows"
    />
    <SummaryCard
      glyph="premium"
      tone="warning"
      total-text="O'rtacha chek"
      :total="formatMoney(avgCheck)"
      :percent="s?.totalSalesAmountGrows"
    />
  </div>
</template>
