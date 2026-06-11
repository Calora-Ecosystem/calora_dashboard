<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: number;
    title: string;
    description: string;
    image: string;
  }>(),
  { title: "title", description: "description" },
);
</script>

<template>
  <RouterLink :to="{ name: 'lesson_edit', params: { lessonId: props.id } }" class="block">
    <div class="lesson-card group">
      <div class="cover">
        <img v-if="props.image" :src="props.image" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div v-else class="w-full h-full flex items-center justify-center" style="color: var(--text-faint)">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <span class="edit-badge">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
        </span>
      </div>
      <div class="p-3.5">
        <h3 class="text-[14px] font-bold line-clamp-1" style="color: var(--text)">{{ props.title }}</h3>
        <p class="text-[12px] mt-1 line-clamp-2" style="color: var(--text-muted)">{{ props.description }}</p>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.lesson-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.lesson-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.cover {
  position: relative;
  height: 130px;
  background: var(--surface-2);
  overflow: hidden;
}
.edit-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-strong);
  background: rgba(255, 255, 255, 0.9);
  opacity: 0;
  transform: translateY(-4px);
  transition: all 0.2s ease;
}
.group:hover .edit-badge {
  opacity: 1;
  transform: translateY(0);
}
</style>
