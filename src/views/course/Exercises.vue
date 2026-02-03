<script setup lang="ts">
import IfEmpty from "../../components/shared/IfEmpty.vue";
import ExerciseCard from "./components/ExerciseCard.vue";
</script>

<template>
  <IfEmpty :value="true">
    <div class="flex flex-row gap-4 flex-wrap">
      <ExerciseCard />
      <ExerciseCard />
      <ExerciseCard />
      <ExerciseCard />
      <ExerciseCard />
      <ExerciseCard />
      <ExerciseCard />
    </div>
  </IfEmpty>
</template>
