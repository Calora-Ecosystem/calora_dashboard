<script setup lang="ts">
import SummaryCard from "../shared/SummaryCard.vue";
</script>
<template>
  <div class="flex flex-row justify-start gap-x-6 overflow-x-auto">
    <SummaryCard icon="summary/user-group.svg" total-text="total_users" />
    <SummaryCard icon="summary/stat.svg" total-text="total_sales" />
    <SummaryCard icon="summary/course.svg" total-text="course_sales" />
    <SummaryCard icon="summary/timer.svg" total-text="subscription_sales" />
  </div>
</template>
