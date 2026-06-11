<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElPopconfirm } from "element-plus";
import GenderSelect from "../../components/shared/GenderSelect.vue";
import { useCourseStore } from "../../stores/courseStore";
import { makeFileUrl } from "../../integrations/axios";

const route = useRoute();
const router = useRouter();

const gender = ref((route.query.gender as string) ?? "male");
const courseStore = useCourseStore();
const courses = ref<any[]>([]);
const loading = ref(true);
const search = ref("");

const load = async () => {
  loading.value = true;
  try {
    courses.value = await courseStore.loadCourses(gender.value);
  } finally {
    loading.value = false;
  }
};

onMounted(load);

watch(gender, async (g) => {
  router.replace({ ...route, query: { ...route.query, gender: g } });
  await load();
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return courses.value;
  return courses.value.filter((c) =>
    (c.title?.uz ?? "").toLowerCase().includes(q),
  );
});

const cover = (c: any) => {
  const url = c.assets?.find((a: any) => a.type === "MainImage")?.url;
  return url ? makeFileUrl(url) : null;
};

const isWorkout = (c: any) => c.type === "Workout";

const goEdit = (c: any) =>
  router.push({ path: `/courses/${c.id}`, query: { gender: c.gender } });
const goView = (c: any) =>
  router.push(isWorkout(c) ? `/courses/${c.id}/workouts` : `/courses/${c.id}/lessons`);
</script>

<template>
  <div class="space-y-5">
    <!-- Toolbar -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
      <div class="flex flex-wrap items-center gap-3">
        <GenderSelect v-model="gender" />
        <div class="search-box">
          <svg class="w-4 h-4 shrink-0" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" type="text" placeholder="Kurs nomidan qidirish..." />
        </div>
      </div>
      <RouterLink :to="{ name: 'course_create' }">
        <button class="btn-create">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi kurs
        </button>
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-24 rounded-2xl animate-pulse" style="background: var(--surface); border: 1px solid var(--border); opacity: .6"></div>
    </div>

    <!-- Rows -->
    <div v-else-if="filtered.length" class="space-y-3">
      <div v-for="c in filtered" :key="c.id" class="course-row group">
        <span class="accent" :style="{ background: isWorkout(c) ? 'var(--brand)' : 'var(--info)' }"></span>

        <div class="thumb">
          <img v-if="cover(c)" :src="cover(c)" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center" style="color: var(--text-faint)">
            <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-[15.5px] font-bold truncate" style="color: var(--text)">{{ c.title?.uz ?? "—" }}</h3>
            <span class="chip" :style="{ background: isWorkout(c) ? 'var(--brand-soft)' : 'var(--info-soft)', color: isWorkout(c) ? 'var(--brand-strong)' : 'var(--info)' }">
              {{ isWorkout(c) ? "Mashqlar" : "Darslar" }}
            </span>
            <span class="chip" style="background: var(--surface-hover); color: var(--text-muted)">Tartib {{ c.order ?? 0 }}</span>
          </div>
          <p class="text-[13px] mt-1 truncate" style="color: var(--text-muted)">{{ c.description?.uz }}</p>
        </div>

        <div class="actions">
          <button class="act-view" @click="goView(c)">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span class="hidden sm:inline">Ochish</span>
          </button>
          <button class="act-icon" title="Tahrirlash" @click="goEdit(c)" style="color: var(--brand-strong); background: var(--brand-soft)">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
          </button>
          <ElPopconfirm title="Kursni o'chirishni tasdiqlaysizmi?" confirm-button-text="Ha" cancel-button-text="Yo'q" @confirm="courseStore.deleteCourse(c.id)">
            <template #reference>
              <button class="act-icon" title="O'chirish" style="color: var(--danger); background: var(--danger-soft)">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </template>
          </ElPopconfirm>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="app-card flex flex-col items-center justify-center py-20 text-center">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background: var(--brand-soft); color: var(--brand-strong)">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6"/></svg>
      </div>
      <h3 class="text-[16px] font-semibold" style="color: var(--text)">{{ search ? "Hech narsa topilmadi" : "Hozircha kurslar yo'q" }}</h3>
      <p class="text-[13.5px] mt-1" style="color: var(--text-faint)">{{ search ? "Boshqa so'z bilan qidiring" : "Birinchi kursni yarating" }}</p>
    </div>
  </div>
</template>

<style scoped>
.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 44px;
  padding: 0 15px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  min-width: 240px;
}
.search-box input {
  background: transparent;
  outline: none;
  border: none;
  font-size: 14px;
  color: var(--text);
  width: 100%;
}
.search-box input::placeholder {
  color: var(--text-faint);
}
.btn-create {
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
.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(var(--brand-rgb), 0.42);
}

.course-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px 14px 22px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  overflow: hidden;
}
.course-row:hover {
  transform: translateX(2px);
  box-shadow: var(--shadow);
  border-color: var(--border-strong);
}
.accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  border-radius: 0 4px 4px 0;
}
.thumb {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.chip {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.act-view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.act-view:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.act-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.act-icon:hover {
  filter: brightness(0.96);
  transform: translateY(-1px);
}
</style>
