<script setup lang="ts">
import { ElPopconfirm } from "element-plus";
import Lottie from "../../../components/shared/Lottie.vue";

const props = withDefaults(
  defineProps<{
    id: number;
    title: string;
    description: string;
    animationLink?: string;
    gif?: string;
  }>(),
  { title: "title", description: "description" },
);

defineEmits<{ delete: [] }>();
</script>

<template>
  <div class="ex-card group">
    <!-- Preview -->
    <div class="preview shrink-0">
      <Lottie v-if="props.animationLink" :animationLink="props.animationLink" />
      <img v-else-if="props.gif" :src="props.gif" class="w-full h-full object-contain" />
      <div v-else class="w-full h-full flex items-center justify-center" style="color: var(--text-faint)">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 6.5h11v11h-11z"/><path d="M2 9v6M22 9v6"/></svg>
      </div>
    </div>

    <!-- Body -->
    <div class="flex flex-col justify-between flex-1 min-w-0 py-1">
      <div class="min-w-0">
        <h3 class="text-[16px] font-bold line-clamp-1" style="color: var(--text)">{{ props.title }}</h3>
        <p class="text-[13px] mt-1 line-clamp-2" style="color: var(--text-muted)">{{ props.description }}</p>
      </div>
      <div class="flex items-center justify-end gap-2 mt-2">
        <RouterLink :to="{ name: 'exercise_edit', params: { exerciseId: props.id } }">
          <button class="act act-primary">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            Tahrirlash
          </button>
        </RouterLink>
        <ElPopconfirm title="O'chirishni tasdiqlaysizmi?" confirm-button-text="Ha" cancel-button-text="Yo'q" @confirm="$emit('delete')">
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
.ex-card {
  display: flex;
  gap: 16px;
  align-items: stretch;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ex-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}
.preview {
  width: 130px;
  height: 130px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 36px;
  padding: 0 14px;
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
.act-danger {
  width: 36px;
  padding: 0;
  color: var(--danger);
  background: var(--danger-soft);
}
.act-danger:hover {
  background: var(--danger);
  color: #fff;
}
</style>
