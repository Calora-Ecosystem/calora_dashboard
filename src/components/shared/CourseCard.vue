<script setup lang="ts">
import { ElPopconfirm } from "element-plus";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { makeFileUrl } from "../../integrations/axios";
import { useCourseStore } from "../../stores/courseStore";
import { CourseType } from "../../@types/common";

const courseStore = useCourseStore();
const router = useRouter();

const props = defineProps<{
  id: number;
  title: string;
  imageLink: string;
  description: string;
  gender: string;
  type: CourseType;
}>();

const childLink = computed(() =>
  props.type === "Workout"
    ? `/courses/${props.id}/workouts`
    : `/courses/${props.id}/lessons`,
);

const typeTone = computed(() =>
  props.type === "Workout"
    ? { bg: "var(--brand-soft)", fg: "var(--brand-strong)", label: "Mashqlar" }
    : { bg: "var(--info-soft)", fg: "var(--info)", label: "Darslar" },
);

const goEdit = () =>
  router.push({ path: `/courses/${props.id}`, query: { gender: props.gender } });
const goView = () => router.push(childLink.value);
</script>

<template>
  <div class="course-card group">
    <!-- Cover -->
    <div class="relative h-40 overflow-hidden" style="background: var(--surface-2)">
      <img
        v-if="imageLink"
        :src="makeFileUrl(imageLink)"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div v-else class="w-full h-full flex items-center justify-center" style="color: var(--text-faint)">
        <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      </div>
      <div class="absolute inset-0" style="background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.35))"></div>
      <span
        class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur"
        :style="{ background: typeTone.bg, color: typeTone.fg }"
      >{{ typeTone.label }}</span>
    </div>

    <!-- Body -->
    <div class="p-4 flex flex-col flex-1">
      <h3 class="text-[16px] font-bold leading-snug line-clamp-1" style="color: var(--text)">{{ title }}</h3>
      <p class="text-[13px] mt-1.5 line-clamp-2 flex-1" style="color: var(--text-muted)">{{ description }}</p>

      <div class="flex items-center gap-2 mt-4">
        <button class="act act-primary flex-1" @click="goEdit">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
          Tahrirlash
        </button>
        <button class="act act-ghost flex-1" @click="goView">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Ko'rish
        </button>
        <ElPopconfirm title="Kursni o'chirishni tasdiqlaysizmi?" @confirm="courseStore.deleteCourse(id)" confirm-button-text="Ha" cancel-button-text="Yo'q">
          <template #reference>
            <button class="act act-danger" title="O'chirish">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </template>
        </ElPopconfirm>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-card {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.course-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.act {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 38px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
}
.act-primary {
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
}
.act-primary:hover {
  box-shadow: 0 6px 14px rgba(var(--brand-rgb), 0.35);
}
.act-ghost {
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.act-ghost:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.act-danger {
  width: 38px;
  color: var(--danger);
  background: var(--danger-soft);
}
.act-danger:hover {
  background: var(--danger);
  color: #fff;
}
</style>
