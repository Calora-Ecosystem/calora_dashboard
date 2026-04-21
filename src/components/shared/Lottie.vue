<script setup lang="ts">
import { onBeforeMount, ref } from "vue";
import { axios } from "../../integrations/axios";
import { set, get } from "idb-keyval";

const props = withDefaults(
  defineProps<{ animationLink: string; force?: boolean }>(),
  { force: false },
);

const loadWithCache = async () => {
  const cached = await get(props.animationLink);
  if (cached && !props.force) {
    return JSON.parse(cached);
  }
  const response = await axios.get(props.animationLink);
  await set(props.animationLink, JSON.stringify(response.data));
  return response.data;
};

const jsonData = ref();

onBeforeMount(async () => {
  jsonData.value = await loadWithCache();
});
</script>
<template>
  <Vue3Lottie v-if="jsonData" :animation-data="jsonData" />
</template>
