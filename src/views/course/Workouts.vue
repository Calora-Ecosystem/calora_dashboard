<script setup lang="ts">
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import { ElPopconfirm, ElTableColumn } from "element-plus";
import { useCourseStore } from "../../stores/courseStore";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const courseStore = useCourseStore();
const route = useRoute();
const router = useRouter();

const courseId = computed(() => Number(route.params.courseId));
const tableKey = ref(0);

const loader = (skip: number, take: number) =>
  courseStore.loadWorkoutsPaged(courseId.value, skip, take);

const handleDelete = async (workoutId: number) => {
  await courseStore.deleteWorkoutById(workoutId);
  tableKey.value++;
};
</script>

<template>
  <Card title="Mashqlar" subtitle="Kursdagi mashq dasturlari">
    <template #actions>
      <div class="flex items-center gap-2.5">
        <button class="btn-ghost" @click="router.back()">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Orqaga
        </button>
        <RouterLink :to="{ name: 'workout_create', params: { courseId } }">
          <button class="btn-primary">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Yangi mashq
          </button>
        </RouterLink>
      </div>
    </template>

    <DataTable :key="tableKey" :loader="loader">
      <ElTableColumn label="ID" prop="id" width="72" />
      <ElTableColumn label="Sarlavha" prop="title.uz" min-width="200">
        <template #default="{ row }">
          <span class="font-semibold" style="color: var(--text)">{{ row.title?.uz ?? "—" }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Kaloriya" min-width="110">
        <template #default="{ row }">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-semibold" style="background: var(--warning-soft); color: var(--warning)">
            🔥 {{ row.kcal ?? row.totalKcal ?? 0 }}
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Davomiyligi" min-width="120">
        <template #default="{ row }">
          <span style="color: var(--text-muted)">{{ row.totalDurationInMin ?? 0 }} daq</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Vazifalar" prop="totalItems" min-width="100">
        <template #default="{ row }">
          <span style="color: var(--text-muted)">{{ row.totalItems ?? 0 }} ta</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Tartib" prop="order" width="90" />
      <ElTableColumn label="Amallar" min-width="150">
        <template #default="{ row }">
          <div class="flex items-center gap-1.5">
            <RouterLink :to="{ name: 'workout_edit', params: { workoutId: row.id } }">
              <button class="icon-act" title="Tahrirlash" style="color: var(--brand-strong); background: var(--brand-soft)">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              </button>
            </RouterLink>
            <RouterLink :to="{ name: 'exercises', params: { workoutId: row.id } }">
              <button class="icon-act" title="Mashqlar" style="color: var(--info); background: var(--info-soft)">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </RouterLink>
            <ElPopconfirm title="O'chirishni tasdiqlaysizmi?" confirm-button-text="Ha" cancel-button-text="Yo'q" @confirm="handleDelete(row.id)">
              <template #reference>
                <button class="icon-act" title="O'chirish" style="color: var(--danger); background: var(--danger-soft)">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>

<style scoped>
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 4px 12px rgba(var(--brand-rgb), 0.3);
  transition: all 0.15s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 11px;
  font-size: 13.5px;
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
.icon-act {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.icon-act:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}
</style>
