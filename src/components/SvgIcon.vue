<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const props = defineProps<{ icon: string }>();

const icon = defineAsyncComponent(
  () => import(/* @vite-ignore */`../assets/${props.icon}`),
);
</script>
<template>
  <component :is="icon" class="fill-current" />
</template>
