<script setup lang="ts">
import { ElButton } from "element-plus";
import Lottie from "../../../components/shared/Lottie.vue";

const props = withDefaults(
  defineProps<{
    id: number;
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

const emits = defineEmits<{
  delete: [];
}>();
</script>

<template>
  <div
    class="w-125.25 h-41.5 flex flex-row bg-white rounded-[10px] gap-3.75 px-2 py-4 items-center"
  >
    <div
      class="w-200 h-36.5 rounded-[10px] flex items-center justify-center min-w-0 overflow-hidden"
    >
      <Lottie v-if="props.animationLink" :animationLink="props.animationLink" />
      <img v-else-if="props.gif" :src="props.gif" class="object-contain!" />
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
        <RouterLink
          :to="{ name: 'exercise_edit', params: { exerciseId: props.id } }"
        >
          <ElButton type="primary">Edit</ElButton>
        </RouterLink>
        <RouterLink to="">
          <ElButton type="default"> Open </ElButton>
        </RouterLink>
        <el-popconfirm title="are_you_sure" @confirm="emits('delete')">
          <template #reference>
            <ElButton type="danger">Delete</ElButton>
          </template>
        </el-popconfirm>
      </div>
    </div>
  </div>
</template>
