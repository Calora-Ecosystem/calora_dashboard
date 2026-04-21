<script setup lang="ts">
import { ElButton, ElImage, ElLink } from "element-plus";

const props = withDefaults(
  defineProps<{
    id: number;
    title: string;
    description: string;
    image: string;
  }>(),
  {
    title: "title",
    description: "description",
  },
);
</script>

<template>
  <RouterLink :to="{ name: 'lesson_edit', params: { lessonId: props.id } }">
    <div
      class="w-62 h-53 flex flex-col bg-white rounded-[10px] gap-2 px-2 py-4 items-center cursor-pointer shadow-lg"
    >
      <div
        class="w-full h-full rounded-[10px] flex items-center justify-center min-w-0 overflow-hidden"
      >
        <img :src="props.image" class="object-contain!" />
      </div>
      <div class="flex flex-col justify-between flex-auto gap-y-1">
        <div class="flex-10 min-w-0 min-h-0">
          <h3
            class="text-[14px] font-semibold truncate rounded-xl wrap-break-word whitespace-break-spaces"
          >
            {{ props.title }}
          </h3>
          <p
            class="text-[11px] font-normal mt-1 truncate line-clamp-2 wrap-break-word min-w-0 whitespace-break-spaces"
          >
            {{ props.description }}
          </p>
        </div>
        <!-- <div class="flex-2 flex flex-row justify-end gap-x-2 shrink-0">
        <RouterLink
          :to="{ name: 'exercise_edit', params: { exerciseId: props.id } }"
        >
          <ElButton type="primary">Edit</ElButton>
        </RouterLink>
        <RouterLink to="">
          <ElButton type="default"> Open </ElButton>
        </RouterLink>
      </div> -->
      </div>
    </div>
  </RouterLink>
</template>
