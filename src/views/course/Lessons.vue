<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCourseStore } from "../../stores/courseStore";
import LessonsCard from "./components/LessonsCard.vue";
import { makeFileUrl } from "../../integrations/axios";

const courseStore = useCourseStore();
const route = useRoute();
const router = useRouter();

const courseId = computed(() => Number(route.params.courseId));
const lessons = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    lessons.value = await courseStore.getLessonsByCourseId(courseId.value);
  } finally {
    loading.value = false;
  }
});

const coverOf = (assets: any[]) =>
  makeFileUrl(assets?.find((x: any) => x.type === "CoverImage")?.url);
</script>

<template>
  <div class="space-y-5">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3">
      <button class="btn-ghost" @click="router.back()">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Orqaga
      </button>
      <RouterLink :to="{ name: 'lesson_create' }">
        <button class="create-btn">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi dars
        </button>
      </RouterLink>
    </div>

    <div v-if="lessons.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <LessonsCard
        v-for="lesson in lessons"
        :key="lesson.id"
        :id="lesson.id"
        :title="lesson.title.uz"
        :description="lesson.description.uz"
        :image="coverOf(lesson.assets)"
      />
    </div>

    <div v-else-if="!loading" class="app-card flex flex-col items-center justify-center py-16 text-center">
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style="background: var(--info-soft); color: var(--info)">
        <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </div>
      <h3 class="text-[15px] font-semibold" style="color: var(--text)">Darslar yo'q</h3>
      <p class="text-[13px] mt-1" style="color: var(--text-faint)">Birinchi darsni qo'shing</p>
    </div>
  </div>
</template>

<style scoped>
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 6px 16px rgba(var(--brand-rgb), 0.3);
  transition: all 0.18s ease;
}
.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(var(--brand-rgb), 0.4);
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.btn-ghost:hover {
  color: var(--text);
  background: var(--surface-hover);
}
</style>
