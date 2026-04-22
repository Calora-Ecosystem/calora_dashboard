<script setup lang="ts">
import { ElTableColumn } from "element-plus";
import { onMounted } from "vue";
import DataTable from "../../components/shared/DataTable.vue";
import Card from "../../components/ui/Card.vue";
import SalesChart from "../../components/ui/SalesChart.vue";
import SalesSummary from "../../components/ui/SalesSummary.vue";
import { useDashboardStore } from "../../stores/dashboardStore";
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
    <DataTable
      :loader="
        (skip, take) => dashboardStore.loadSubscriptionOrders(skip, take)
      "
    >
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
    </DataTable>
  </Card>
</template>

<style></style>
