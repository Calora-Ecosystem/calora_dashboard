<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

const props = withDefaults(
  defineProps<{
    glyph?: "users" | "sales" | "money" | "premium";
    totalText?: string;
    total?: number | string;
    percent?: number;
    percentText?: string;
    url?: string;
    tone?: "brand" | "info" | "purple" | "warning";
  }>(),
  {
    glyph: "users",
    totalText: "Total",
    total: 0,
    percent: 0,
    percentText: "kechagiga nisbatan",
    tone: "brand",
  },
);

const toneVars = computed(() => {
  const map: Record<string, { bg: string; fg: string }> = {
    brand: { bg: "var(--brand-soft)", fg: "var(--brand-strong)" },
    info: { bg: "var(--info-soft)", fg: "var(--info)" },
    purple: { bg: "var(--purple-soft)", fg: "var(--purple)" },
    warning: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  };
  return map[props.tone];
});

const isUp = computed(() => (props.percent ?? 0) >= 0);
const abs = (v?: number) => Math.abs(v ?? 0);
</script>

<template>
  <component
    :is="props.url ? RouterLink : 'div'"
    :to="props.url"
    class="block"
  >
    <div class="app-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group h-full">
      <div class="flex items-start justify-between gap-3">
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          :style="{ background: toneVars.bg, color: toneVars.fg }"
        >
          <!-- users -->
          <svg v-if="glyph === 'users'" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <!-- sales -->
          <svg v-else-if="glyph === 'sales'" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
          <!-- money -->
          <svg v-else-if="glyph === 'money'" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <!-- premium -->
          <svg v-else class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>

        <span
          class="flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-full"
          :style="{
            background: isUp ? 'var(--success-soft)' : 'var(--danger-soft)',
            color: isUp ? 'var(--success)' : 'var(--danger)',
          }"
        >
          <svg class="w-3 h-3" :class="{ 'rotate-180': !isUp }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          {{ abs(percent) }}%
        </span>
      </div>

      <div class="mt-4">
        <p class="text-[13px] font-medium" style="color: var(--text-muted)">{{ totalText }}</p>
        <p class="text-[28px] font-bold mt-1 leading-none tracking-tight" style="color: var(--text)">
          {{ total }}
        </p>
        <p class="text-[12px] mt-2" style="color: var(--text-faint)">
          <span :style="{ color: isUp ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }">
            {{ isUp ? "+" : "-" }}{{ abs(percent) }}%
          </span>
          {{ percentText }}
        </p>
      </div>
    </div>
  </component>
</template>
