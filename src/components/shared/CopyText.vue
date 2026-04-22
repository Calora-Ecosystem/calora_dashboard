<script setup lang="ts">
import { ref } from "vue";
import { ElIcon, ElTooltip } from "element-plus";
import { CopyDocument, Check } from "@element-plus/icons-vue";

const props = withDefaults(
  defineProps<{
    text: string;
    alwaysVisible?: boolean;
  }>(),
  { alwaysVisible: true }
);

const copied = ref(false);

async function copy() {
  await navigator.clipboard.writeText(props.text);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <span class="inline-flex items-center gap-1 group">
    {{ text }}
    <ElTooltip content="Nusxalandi!" :visible="copied" placement="top">
      <button
        type="button"
        class="transition-opacity cursor-pointer text-gray-400 hover:text-gray-600"
        :class="alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
        @click.stop="copy"
      >
        <ElIcon :class="copied ? 'text-green-500' : ''">
          <Check v-if="copied" />
          <CopyDocument v-else />
        </ElIcon>
      </button>
    </ElTooltip>
  </span>
</template>
