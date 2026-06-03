<script setup lang="ts">
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import { ElButton, ElTableColumn } from "element-plus";
import { useCourseStore } from "../../stores/courseStore";
import { computed } from "vue";
import { useRoute } from "vue-router";

const courseStore = useCourseStore();
const route = useRoute();

const courseId = computed(() => Number(route.params.courseId));

const loader = (skip: number, take: number) =>
  courseStore.loadWorkoutsPaged(courseId.value, skip, take);
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
    <DataTable :loader="loader">
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
    </DataTable>
  </Card>
</template>
