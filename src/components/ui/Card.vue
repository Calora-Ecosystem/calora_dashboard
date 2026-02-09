<script setup lang="ts">
import { useSlots } from "vue";

const props = withDefaults(defineProps<{ title?: string }>(), { title: "" });
const slots = useSlots();
</script>
<template>
  <div class="bg-white rounded-[14px] shadow-lg p-4 overflow-x-auto min-w-0">
    <template v-if="slots.title">
      <slot name="title" />
    </template>
    <h2 v-else class="font-semibold text-[24px]">{{ props.title }}</h2>
    <slot />
  </div>
</template>
