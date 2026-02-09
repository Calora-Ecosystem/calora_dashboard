<script setup lang="ts">
import { ElTable, ElTableColumn } from "element-plus";
import SummaryCard from "../../components/shared/SummaryCard.vue";
import SalesChart from "../../components/ui/SalesChart.vue";
import IfEmpty from "../../components/shared/IfEmpty.vue";
import Card from "../../components/ui/Card.vue";
import SalesSummary from "../../components/ui/SalesSummary.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
import { onMounted } from "vue";
import { formatDate, formatMoney } from "../../utils/FormatHelper";

const dashboardStore = useDashboardStore();

onMounted(async () => {
  await dashboardStore.loadSubscriptionOrders();
});
</script>

<template>
  <SalesSummary />
  <div class="h-7"></div>
  <div>
    <SalesChart />
  </div>
  <div class="h-7"></div>
  <Card title="Sales List">
    <IfEmpty :value="dashboardStore.subscriptionOrders">
      <ElTable :fit="true" :data="dashboardStore.subscriptionOrders">
        <ElTableColumn label="ID" prop="id" />
        <ElTableColumn label="User name" prop="userName" />
        <ElTableColumn label="Plan" prop="plan" />
        <ElTableColumn
          label="Price"
          prop="amount"
          :formatter="(val) => formatMoney(val.amount, 'standard')"
        />
        <ElTableColumn
          label="Date"
          prop="createdAt"
          :formatter="(val) => formatDate(val.createdAt)"
        />
        <ElTableColumn label="Status" prop="orderStatus" />
      </ElTable>
    </IfEmpty>
  </Card>
</template>

<style></style>
