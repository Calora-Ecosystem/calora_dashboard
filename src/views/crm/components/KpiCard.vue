<script setup lang="ts">
import Icon from "./Icon.vue";

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
        :style="{ background: `color-mix(in srgb, ${accent || 'var(--brand)'} 14%, transparent)`, color: accent || 'var(--brand-strong)' }"
      >
        <Icon :name="icon" :size="17" />
      </span>
    </div>
    <div class="kpi-value" :style="{ color: accent || 'var(--text)' }">{{ value }}</div>
    <div v-if="hint" class="kpi-hint">
      <span class="dot" :style="{ background: accent || 'var(--brand)' }" />{{ hint }}
    </div>
  </div>
</template>

<style scoped>
.kpi {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.kpi:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kpi-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  line-height: 1.3;
}
.kpi-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-value {
  font-size: 25px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.5px;
}
.kpi-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-faint);
}
.kpi-hint .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
@media (max-width: 480px) {
  .kpi-value { font-size: 22px; }
}
</style>
