<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import IfEmpty from "../../components/shared/IfEmpty.vue";
import { useCourseStore } from "../../stores/courseStore";
import LessonsCard from "./components/LessonsCard.vue";
import { makeFileUrl } from "../../integrations/axios";

const courseStore = useCourseStore();
const route = useRoute();

const courseId = computed(() => Number(route.params.courseId));

const lessons = ref<any[]>([]);

onMounted(async () => {
  lessons.value = await courseStore.getLessonsByCourseId(courseId.value);
});
</script>

<template>
  <div class="flex justify-between">
    <div></div>
    <div>
      <RouterLink :to="{ name: 'lesson_create' }">
        <ElButton type="primary" size="large">Create</ElButton>
      </RouterLink>
    </div>
  </div>
  <IfEmpty :value="lessons">
    <div class="flex flex-wrap gap-x-4 gap-y-2">
      <LessonsCard
        v-for="lesson in lessons"
        :key="lesson.id"
        :id="lesson.id"
        :title="lesson.title.uz"
        :description="lesson.description.uz"
        :image="
          makeFileUrl(
            lesson.assets.find((x: any) => x.type === 'CoverImage')?.url,
          )
        "
      />
    </div>
  </IfEmpty>
</template>
