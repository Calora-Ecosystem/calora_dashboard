<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import IfEmpty from "../../components/shared/IfEmpty.vue";
import { makeFileUrl } from "../../integrations/axios";
import { useCourseStore } from "../../stores/courseStore";
import ExerciseCard from "./components/ExerciseCard.vue";
import { ElButton } from "element-plus";

const courseStore = useCourseStore();
const route = useRoute();

const courseId = computed(() => Number(route.params.courseId));
const workoutId = computed(() => Number(route.params.workoutId));

onMounted(async () => {
  await courseStore.loadExercises(workoutId.value);
});
</script>

<template>
  <div class="flex justify-between">
    <div></div>
    <div>
      <RouterLink :to="{ name: 'exercises_create' }">
        <ElButton type="primary" size="large">Create</ElButton>
      </RouterLink>
    </div>
  </div>
  <IfEmpty :value="courseStore.exercises[workoutId] as any">
    <div class="flex flex-row gap-4 flex-wrap">
      <ExerciseCard
        v-for="value in courseStore.exercises[workoutId]"
        :key="value.id"
        :id="value.id"
        :title="value.title.uz"
        :animation-link="
          value.assets.find((a: { type: string }) => a.type === 'Lotte')?.url
            ? makeFileUrl(
                value.assets.find((a: { type: string }) => a.type === 'Lotte')
                  ?.url,
              )
            : null
        "
        :gif="
          value.assets.find(
            (a: { type: string }) => a.type === 'Default' || a.type === 'Gif',
          )
            ? makeFileUrl(
                value.assets.find(
                  (a: { type: string }) =>
                    a.type === 'Default' || a.type === 'Gif',
                )?.url,
              )
            : null
        "
        :description="value.description.uz"
      />
    </div>
  </IfEmpty>
</template>
