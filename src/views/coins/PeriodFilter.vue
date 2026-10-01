<script setup lang="ts">
import { computed } from "vue";
import { ElDatePicker } from "element-plus";
import { PERIOD_PRESETS, type PeriodState } from "./coinMeta";

const props = defineProps<{ modelValue: PeriodState }>();
const emit = defineEmits<{ (e: "update:modelValue", v: PeriodState): void }>();

const range = computed<[string, string] | null>({
  get: () =>
    props.modelValue.key === "custom" && props.modelValue.from && props.modelValue.to
      ? ([props.modelValue.from, props.modelValue.to] as [string, string])
      : null,
  set: (v: [string, string] | null) => {
    if (v && v.length === 2) emit("update:modelValue", { key: "custom", from: v[0], to: v[1] });
    else emit("update:modelValue", { key: "all" });
  },
});

const isFuture = (d: Date) => d.getTime() > Date.now();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5">
    <div class="seg">
      <button
        v-for="p in PERIOD_PRESETS"
        :key="p.key"
        class="seg-btn"
        :class="{ 'seg-active': modelValue.key === p.key }"
        @click="emit('update:modelValue', { key: p.key })"
      >
        {{ p.label }}
      </button>
    </div>
    <div class="range-wrap" :class="{ 'range-active': modelValue.key === 'custom' }">
      <ElDatePicker
        v-model="range"
        type="daterange"
        range-separator="—"
        start-placeholder="Boshlanish"
        end-placeholder="Tugash"
        format="DD.MM.YYYY"
        value-format="YYYY-MM-DD"
        :disabled-date="isFuture"
      />
    </div>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 4px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  gap: 3px;
}
.seg-btn {
  padding: 7px 13px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s ease;
  white-space: nowrap;
}
.seg-btn:hover {
  color: var(--text);
}
.seg-active {
  background: var(--surface);
  color: var(--brand-strong);
  box-shadow: var(--shadow-sm);
}
.range-wrap :deep(.el-date-editor.el-input__wrapper) {
  width: 250px;
}
.range-active :deep(.el-range-input) {
  color: var(--brand-strong);
  font-weight: 600;
}
</style>
