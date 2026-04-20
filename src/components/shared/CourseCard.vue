<script setup lang="ts">
import { ElButton, ElImage, ElLink } from "element-plus";
import { makeFileUrl } from "../../integrations/axios";
import { useCourseStore } from "../../stores/courseStore";
import { CourseType } from "../../@types/common";

const courseStore = useCourseStore();

const props = defineProps<{
  id: number;
  title: string;
  imageLink: string;
  description: string;
  gender: string;
  type: CourseType;
}>();

const childLink =
  props.type === "Workout"
    ? `/courses/${props.id}/workouts`
    : `/courses/${props.id}/lessons`;
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
          path: `/courses/${props.id}`,
          query: { gender: props.gender },
        }"
      >
        <ElButton type="primary" class="mt-4 w-auto!">Edit</ElButton>
      </RouterLink>
      <ElLink :href="childLink">
        <ElButton type="primary" class="mt-4 w-auto!">View</ElButton>
      </ElLink>
      <ElButton
        type="danger"
        class="mt-4 w-auto!"
        @click="courseStore.deleteCourse(props.id)"
        >Delete</ElButton
      >
    </div>
  </div>
</template>
