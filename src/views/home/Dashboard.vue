<script setup lang="ts">
import { ElTable, ElTableColumn } from "element-plus";
import SummaryCard from "../../components/shared/SummaryCard.vue";
import SalesChart from "../../components/ui/SalesChart.vue";
import IfEmpty from "../../components/shared/IfEmpty.vue";
</script>

<template>
  <div class="flex flex-row justify-between gap-x-2">
    <SummaryCard icon="summary/user-group.svg" total-text="total_users" />
    <SummaryCard icon="summary/stat.svg" total-text="total_sales" />
    <SummaryCard icon="summary/course.svg" total-text="course_sales" />
    <SummaryCard icon="summary/timer.svg" total-text="subscription_sales" />
  </div>
  <div class="h-7"></div>
  <div>
    <SalesChart />
  </div>
  <div class="h-7"></div>
  <div class="bg-white rounded-[14px] shadow-lg py-[16px] px-[8px]">
    <h1>Sales List</h1>
    <IfEmpty :value="false">
      <ElTable :fit="true" header-cell-class-name="bg-red-200">
        <ElTableColumn label="Email/Phone" />
        <ElTableColumn label="Product Type" />
        <ElTableColumn label="Date - Time" />
        <ElTableColumn label="Price" />
        <ElTableColumn label="Ex-date" />
        <ElTableColumn label="Status" />
      </ElTable>
    </IfEmpty>
  </div>
</template>

<style></style>
