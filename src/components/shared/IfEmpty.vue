<script setup lang="ts">
import { computed, onBeforeMount, ref, watch } from "vue";

type TValue = boolean | any[];

const props = defineProps<{
  value: TValue | (() => Promise<TValue>) | (() => TValue);
}>();

const isEmpty = async (value: typeof props.value) => {
  if (Array.isArray(value)) return value.length == 0;

  if (typeof value === "boolean") return value;

  if (typeof value === "function") {
    let result = value();

    if (result instanceof Promise) return isEmpty(await result);

    return isEmpty(value);
  }

  return true;
};

const emptyRef = ref(true);

watch(
  () => props.value,
  async () => {
    emptyRef.value = await isEmpty(props.value);
  },
);

onBeforeMount(async () => {
  emptyRef.value = await isEmpty(props.value);
});
</script>
<template>
  <template v-if="emptyRef"> Empty </template>
  <template v-else>
    <slot />
  </template>
</template>
