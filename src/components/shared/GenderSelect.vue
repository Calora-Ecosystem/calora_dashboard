<script setup lang="ts">
const model = defineModel<string | null>({ default: null, required: false });

const options = [
  { key: "male", label: "Erkaklar" },
  { key: "female", label: "Ayollar" },
];
</script>

<template>
  <div class="inline-flex p-1 rounded-xl" style="background: var(--surface); border: 1px solid var(--border)">
    <button
      v-for="o in options"
      :key="o.key"
      class="flex items-center gap-2 px-4 py-2 rounded-lg text-[13.5px] font-semibold transition-all"
      :class="model === o.key ? 'seg-active' : 'seg-idle'"
      @click="model = o.key"
    >
      <svg v-if="o.key === 'male'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="5"/><path d="M19 5l-5.4 5.4"/><path d="M14 5h5v5"/></svg>
      <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M12 13v8"/><path d="M9 18h6"/></svg>
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.seg-active {
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  color: #fff;
  box-shadow: 0 4px 12px rgba(var(--brand-rgb), 0.3);
}
.seg-idle {
  color: var(--text-muted);
}
.seg-idle:hover {
  color: var(--text);
}
</style>
