<script setup lang="ts">
import { computed } from "vue";
import { ElDatePicker, ElOption, ElSelect } from "element-plus";
import { PERIOD_PRESETS, toDateStr, type PeriodKey, type PeriodState } from "./coinMeta";
import { useIsMobile } from "../../composables/useIsMobile";

const props = defineProps<{ modelValue: PeriodState }>();
const emit = defineEmits<{ (e: "update:modelValue", v: PeriodState): void }>();

const isMobile = useIsMobile();

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

// Telefonda: preset select + "Oraliq" tanlansa ikkita oddiy sana (daterange paneli ekranga sig'maydi).
const presetKey = computed<PeriodKey>({
  get: () => props.modelValue.key,
  set: (key) => {
    if (key === "custom") {
      const today = toDateStr(new Date());
      emit("update:modelValue", { key: "custom", from: props.modelValue.from ?? today, to: props.modelValue.to ?? today });
    } else emit("update:modelValue", { key });
  },
});

const setFrom = (from: string) => emit("update:modelValue", { key: "custom", from, to: props.modelValue.to ?? from });
const setTo = (to: string) => emit("update:modelValue", { key: "custom", from: props.modelValue.from ?? to, to });

const isFuture = (d: Date) => d.getTime() > Date.now();
</script>

<template>
  <div v-if="isMobile" class="m-filter">
    <ElSelect v-model="presetKey" class="m-select">
      <ElOption v-for="p in PERIOD_PRESETS" :key="p.key" :label="p.label" :value="p.key" />
      <ElOption label="Oraliq" value="custom" />
    </ElSelect>
    <div v-if="modelValue.key === 'custom'" class="m-dates">
      <ElDatePicker
        :model-value="modelValue.from"
        type="date"
        format="DD.MM.YY"
        value-format="YYYY-MM-DD"
        :clearable="false"
        :editable="false"
        :disabled-date="isFuture"
        @update:model-value="setFrom"
      />
      <ElDatePicker
        :model-value="modelValue.to"
        type="date"
        format="DD.MM.YY"
        value-format="YYYY-MM-DD"
        :clearable="false"
        :editable="false"
        :disabled-date="isFuture"
        @update:model-value="setTo"
      />
    </div>
  </div>

  <div v-else class="flex flex-wrap items-center gap-2">
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
.seg { display: inline-flex; flex-wrap: wrap; padding: 3px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); gap: 2px; }
.seg-btn { padding: 5px 11px; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); white-space: nowrap; transition: all 0.15s ease; }
.seg-btn:hover { color: var(--text); }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.range-wrap :deep(.el-date-editor.el-input__wrapper) { width: 240px; }
.range-active :deep(.el-range-input) { color: var(--brand-strong); font-weight: 600; }

.m-filter { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.m-select { width: 100%; }
.m-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.m-dates :deep(.el-date-editor.el-input) { width: 100%; }
</style>
