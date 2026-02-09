<script setup lang="ts">
import { ElButton, ElImage, ElLink } from "element-plus";
import Lottie from "../../../components/shared/Lottie.vue";

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    animationLink?: string;
    gif?: string;
  }>(),
  {
    title: "title",
    description: "description",
  },
);
</script>

<template>
  <div
    class="w-125.25 h-41.5 flex flex-row bg-white rounded-[10px] gap-3.75 px-2 py-4"
  >
    <div class="w-200 h-36.5 rounded-[10px] flex items-center justify-center">
      <Lottie v-if="props.animationLink" :animationLink="props.animationLink" />
      <ElImage v-else-if="props.gif" :src="props.gif" />
    </div>
    <div class="flex flex-col justify-between flex-auto gap-y-1">
      <div class="flex-10 min-w-0 min-h-0">
        <h3 class="text-[18px] font-bold mt-2 truncate">{{ props.title }}</h3>
        <p
          class="text-[14px] mt-1 truncate line-clamp-2 wrap-break-word min-w-0 whitespace-break-spaces"
        >
          {{ props.description }}
        </p>
      </div>
      <div class="flex-2 flex flex-row justify-end gap-x-2 shrink-0">
        <ElButton type="primary">Edit</ElButton>
        <RouterLink to="">
          <ElButton type="default"> Open </ElButton>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
