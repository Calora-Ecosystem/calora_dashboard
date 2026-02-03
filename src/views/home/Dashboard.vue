<script setup lang="ts">
import { ElTable, ElTableColumn } from "element-plus";
import SummaryCard from "../../components/shared/SummaryCard.vue";
import SalesChart from "../../components/ui/SalesChart.vue";
import IfEmpty from "../../components/shared/IfEmpty.vue";
import Card from "../../components/ui/Card.vue";
import SalesSummary from "../../components/ui/SalesSummary.vue";
</script>

<template>
  <SalesSummary />
  <div class="h-7"></div>
  <div>
    <SalesChart />
  </div>
  <div class="h-7"></div>
  <Card title="Sales List">
    <IfEmpty :value="true">
      <ElTable :fit="true" header-cell-class-name="bg-red-200">
        <ElTableColumn label="Email/Phone" />
        <ElTableColumn label="Product Type" />
        <ElTableColumn label="Date - Time" />
        <ElTableColumn label="Price" />
        <ElTableColumn label="Ex-date" />
        <ElTableColumn label="Status" />
      </ElTable>
    </IfEmpty>
  </Card>
</template>

<style></style>
