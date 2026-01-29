<script setup lang="ts">
import { ref } from "vue";
import SvgIcon from "./SvgIcon.vue";

const props = withDefaults(
  defineProps<{ isActive?: boolean; icon: string; value?: any }>(),
  {
    isActive: false,
  },
);

const emits = defineEmits<{
  (e: "click", value?: any): Promise<void>;
}>();

const isHovering = ref(false);
</script>
<template>
  <div class="flex flex-row justify-center p-2">
    <div class="flex-1 relative">
      <div
        class="absolute h-full left-[-13px] w-[10px] rounded-[4px] transition-all"
        :class="{ 'bg-[#7CC243]': isHovering, 'bg-transparent': !isHovering }"
      ></div>
    </div>
    <div
      class="flex-10 flex flex-row h-[50px] rounded-[6px] justify-around p-2 gap-x-2 items-center cursor-pointer"
      :class="{
        'bg-[#7CC243] text-white': props.isActive,
        '': !props.isActive,
      }"
      @mouseenter="() => (isHovering = true)"
      @mouseleave="() => (isHovering = false)"
      @click="emits('click', props.value)"
    >
      <div class="flex-2">
        <svg-icon
          :icon="props.icon"
          class="text-transparent"
          :class="{
            'stroke-black stroke-2': !props.isActive,
            'stroke-white stroke-2': props.isActive,
          }"
        />
      </div>
      <div class="flex-10 font-normal text-[14px]">
        <slot />
      </div>
    </div>
    <div class="flex-1"></div>
  </div>
</template>
