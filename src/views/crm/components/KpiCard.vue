<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  icon?: string;
  accent?: string;
  hint?: string;
}>();
</script>

<template>
  <div class="kpi app-card">
    <div class="kpi-top">
      <span class="kpi-label">{{ label }}</span>
      <span
        v-if="icon"
        class="kpi-icon"
        :style="{ background: (accent || 'var(--brand)') + '1f', color: accent || 'var(--brand-strong)' }"
        >{{ icon }}</span
      >
    </div>
    <div class="kpi-value" :style="{ color: accent || 'var(--text)' }">{{ value }}</div>
    <div v-if="hint" class="kpi-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.kpi {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kpi-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
}
.kpi-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}
.kpi-value {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.1;
}
.kpi-hint {
  font-size: 11.5px;
  color: var(--text-faint);
}
</style>
