<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const props = defineProps<{ icon: string }>();

const icons = import.meta.glob("../assets/**/*.svg", { eager: true });

console.log(icons);

const icon = defineAsyncComponent(() => {
  const path = `../assets/${props.icon}`;
  console.log(path);
  const comp = icons[path];
  if (!comp) throw new Error(`${path} not found`);
  return Promise.resolve(comp);
});
</script>
<template>
  <component :is="icon" class="fill-current" />
</template>
