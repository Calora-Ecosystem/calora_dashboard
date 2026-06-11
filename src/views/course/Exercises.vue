<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { makeFileUrl } from "../../integrations/axios";
import { useCourseStore } from "../../stores/courseStore";
import ExerciseCard from "./components/ExerciseCard.vue";

const courseStore = useCourseStore();
const route = useRoute();
const router = useRouter();

const workoutId = computed(() => Number(route.params.workoutId));
const loading = ref(true);

const load = async () => {
  loading.value = true;
  try {
    await courseStore.loadExercises(workoutId.value);
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const handleDelete = async (exerciseId: number) => {
  await courseStore.deleteExerciseById(exerciseId);
  await courseStore.loadExercises(workoutId.value);
};

const assetUrl = (assets: any[], types: string[]) => {
  const a = assets?.find((x: any) => types.includes(x.type));
  return a?.url ? makeFileUrl(a.url) : (null as any);
};

const items = computed(() => courseStore.exercises[workoutId.value] ?? []);
</script>

<template>
  <div class="space-y-5">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3">
      <button class="btn-ghost" @click="router.back()">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Orqaga
      </button>
      <RouterLink :to="{ name: 'exercises_create' }">
        <button class="create-btn">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi mashq
        </button>
      </RouterLink>
    </div>

    <div v-if="items.length" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ExerciseCard
        v-for="value in items"
        :key="value.id"
        :id="value.id"
        :title="value.title.uz"
        :description="value.description.uz"
        :animation-link="assetUrl(value.assets, ['Lotte'])"
        :gif="assetUrl(value.assets, ['Default', 'Gif'])"
        @delete="handleDelete(value.id)"
      />
    </div>

    <div v-else-if="!loading" class="app-card flex flex-col items-center justify-center py-16 text-center">
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style="background: var(--brand-soft); color: var(--brand-strong)">
        <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 6.5h11v11h-11z"/><path d="M2 9v6M22 9v6"/></svg>
      </div>
      <h3 class="text-[15px] font-semibold" style="color: var(--text)">Mashqlar yo'q</h3>
      <p class="text-[13px] mt-1" style="color: var(--text-faint)">Birinchi mashqni qo'shing</p>
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
