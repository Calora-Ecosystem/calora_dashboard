<script setup lang="ts">
import SalesChart from "../../components/ui/SalesChart.vue";
import SalesSummary from "../../components/ui/SalesSummary.vue";
import UserStates from "../../components/ui/UserStates.vue";
import RevenueOverview from "../../components/ui/RevenueOverview.vue";
import UserActivity from "../../components/ui/UserActivity.vue";
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <!-- KPI row -->
    <SalesSummary />

    <!-- Sales trend + user states -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div class="xl:col-span-2 min-w-0">
        <SalesChart />
      </div>
      <div class="min-w-0">
        <UserStates />
      </div>
    </div>

    <!-- Revenue + user activity -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div class="xl:col-span-2 min-w-0">
        <RevenueOverview />
      </div>
      <div class="min-w-0">
        <UserActivity />
      </div>
    </div>
  </div>
</template>
