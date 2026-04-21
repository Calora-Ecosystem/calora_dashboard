<script setup lang="ts">
import Card from "../../components/ui/Card.vue";
import IfEmpty from "../../components/shared/IfEmpty.vue";
import { ElButton, ElLink, ElTable, ElTableColumn } from "element-plus";
import { useCourseStore } from "../../stores/courseStore";
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";

const courseStore = useCourseStore();
const route = useRoute();

const courseId = computed(() => Number(route.params.courseId));

onMounted(async () => {
  await courseStore.loadWorkouts(courseId.value);
});
</script>
<template>
  <Card title="">
    <div class="flex flex-row items-center justify-between mb-2">
      <div>#filter_elements</div>
      <div>
        <RouterLink
          :to="{ name: 'workout_create', params: { courseId: courseId } }"
        >
          <ElButton size="large" type="primary">Create</ElButton>
        </RouterLink>
      </div>
    </div>
    <IfEmpty :value="courseStore.workouts[courseId] as any">
      <ElTable
        :fit="true"
        :data="courseStore.workouts[courseId] || ([] as any)"
      >
        <ElTableColumn label="ID" prop="id" />
        <ElTableColumn label="Title" prop="title.uz" />
        <ElTableColumn label="Calories" />
        <ElTableColumn label="Duration(Min)" prop="totalDurationInMin" />
        <ElTableColumn label="Tasks" prop="totalItems" />
        <ElTableColumn label="Sort Number" prop="order" />
        <ElTableColumn label="Actions">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-2 justify-center items-center">
              <RouterLink
                :to="{ name: 'workout_edit', params: { workoutId: row.id } }"
              >
                <ElButton size="small" type="primary">edit</ElButton>
              </RouterLink>
              <ElButton size="small" type="danger">delete</ElButton>
              <RouterLink
                :to="{ name: 'exercises', params: { workoutId: row.id } }"
              >
                <ElButton size="small">exercises</ElButton>
              </RouterLink>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </IfEmpty>
  </Card>
</template>
