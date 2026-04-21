<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    icon: string;
    totalText?: string;
    total?: number | string;
    percent?: number;
    percentText?: string;
  }>(),
  {
    totalText: "Total",
    total: 0,
    percent: 0,
    percentText: "from anytime",
  },
);

const abs = (value: number) => Math.abs(value);

const isHovering = ref(false);
</script>
<template>
  <div
    class="p-[0.2rem] inline-block rounded-[14px] transition-colors m-0 border-0"
    :class="{ ' bg-[#7CC243]': isHovering }"
  >
    <div
      class="flex flex-col w-[262px] h-[161px] rounded-[14px] shadow-lg bg-white overflow-hidden cursor-pointer"
      @mouseenter="() => (isHovering = true)"
      @mouseleave="() => (isHovering = false)"
    >
      <div class="flex-9 flex flex-row px-2 py-4">
        <div class="flex-8 flex flex-col gap-y-4 shrink-0">
          <p class="font-semibold text-[#202224] opacity-70 text-[16px]">
            {{ props.totalText }}
          </p>
          <p class="font-bold text-[#202224] text-[28px]">
            {{ props.total }}
          </p>
        </div>
        <div class="flex-4 flex justify-center shrink-0">
          <svg-icon :icon="props.icon" />
        </div>
      </div>
      <div class="flex-3 flex items-center justify-center gap-x-1">
        <template v-if="props.percent < 0">
          <svg-icon icon="summary/down.svg" />
          <p class="text-[#F93C65]">{{ abs(props.percent) }}%</p>
        </template>
        <template v-else>
          <svg-icon icon="summary/up.svg" />
          <p class="text-[#00B69B]">{{ abs(props.percent) }}%</p>
        </template>

        {{ props.percentText }}
      </div>
    </div>
  </div>
</template>
