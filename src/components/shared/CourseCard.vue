<script setup lang="ts">
import { ElButton, ElImage, ElLink } from "element-plus";
import SvgIcon from "./SvgIcon.vue";
import { makeFileUrl } from "../../integrations/axios";

const props = defineProps<{
  id: number;
  title: string;
  imageLink: string;
  description: string;
  gender: string;
}>();
</script>
<template>
  <div
    class="bg-white rounded-[20px] w-75 h-80.75 flex flex-col px-2 py-4 justify-between"
  >
    <div class="w-70 h-33.75 overflow-hidden min-h-0 min-w-0">
      <ElImage
        :src="makeFileUrl(props.imageLink)"
        class="w-full h-full"
        fit="contain"
      />
      <!-- <SvgIcon :icon="props.svg" /> -->
    </div>
    <div>
      <h3 class="text-[20px] font-bold mt-2">
        {{ props.title }}
      </h3>
      <p class="text-[14px] mt-1">{{ props.description }}</p>
    </div>
    <div class="flex gap-x-2">
      <RouterLink
        :to="{
          path: `/video-course/${props.id}`,
          query: { gender: props.gender },
        }"
      >
        <ElButton type="primary" class="mt-4 w-auto!">Edit</ElButton>
      </RouterLink>
      <ElLink :href="`/video-course/${props.id}/workouts`">
        <ElButton type="primary" class="mt-4 w-auto!">View</ElButton>
      </ElLink>
    </div>
  </div>
</template>
