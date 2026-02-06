<script setup lang="ts">
import { ElButton, ElButtonGroup } from "element-plus";
const model = defineModel<string | null>({ default: null, required: false });
</script>
<template>
  <div>
    <ElButtonGroup size="large">
      <ElButton
        @click="model = 'man'"
        :type="model === 'man' ? 'primary' : 'default'"
        class="rounded-l-xl!"
        >Man</ElButton
      >
      <ElButton
        @click="model = 'woman'"
        :type="model === 'woman' ? 'primary' : 'default'"
        class="rounded-r-xl!"
        >Woman</ElButton
      >
    </ElButtonGroup>
  </div>
</template>
