<script setup lang="ts">
import { onMounted } from "vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import SummaryCard from "../shared/SummaryCard.vue";
import { formatMoney } from "../../utils/FormatHelper";
const dashboardStore = useDashboardStore();

onMounted(async () => {
  await dashboardStore.loadOverallSummary();
});
</script>
<template>
  <div class="flex flex-row justify-start gap-x-6 overflow-x-auto">
    <SummaryCard
      icon="summary/user-group.svg"
      total-text="total_users"
      :total="dashboardStore.overallSummary?.totalUsers"
      :percent="dashboardStore.overallSummary?.totalUsersGrows"
      percent-text="yesterday"
      url="/users"
    />
    <SummaryCard
      icon="summary/stat.svg"
      total-text="total_sales"
      :total="dashboardStore.overallSummary?.totalSalesCount"
      :percent="dashboardStore.overallSummary?.totalSalesCountGrows"
      percent-text="yesterday"
    />
    <SummaryCard
      icon="summary/course.svg"
      total-text="course_sales"
      :total="formatMoney(dashboardStore.overallSummary?.totalSalesAmount)"
      :percent="dashboardStore.overallSummary?.totalSalesAmountGrows"
      percent-text="from yesterday"
    />
  </div>
</template>
