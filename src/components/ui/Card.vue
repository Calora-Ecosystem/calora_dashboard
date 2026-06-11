<script setup lang="ts">
import { useSlots } from "vue";

const props = withDefaults(
  defineProps<{ title?: string; subtitle?: string }>(),
  { title: "", subtitle: "" },
);
const slots = useSlots();
</script>

<template>
  <section class="app-card p-5 min-w-0 overflow-hidden">
    <template v-if="slots.title">
      <slot name="title" />
    </template>
    <div v-else-if="props.title" class="flex items-center justify-between mb-5 gap-3">
      <div class="min-w-0">
        <h2 class="font-bold text-[17px] truncate" style="color: var(--text)">{{ props.title }}</h2>
        <p v-if="props.subtitle" class="text-[12.5px] mt-0.5" style="color: var(--text-faint)">
          {{ props.subtitle }}
        </p>
      </div>
      <slot name="actions" />
    </div>
    <div class="overflow-x-auto">
      <slot />
    </div>
  </section>
</template>
