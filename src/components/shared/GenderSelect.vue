<script setup lang="ts">
import { ElButton, ElButtonGroup } from "element-plus";

const MALE_SELECTOR = "male";
const FEMALE_SELECTOR = "female";

const model = defineModel<string | null>({
  default: null,
  required: false,
});
</script>
<template>
  <div>
    <ElButtonGroup size="large">
      <ElButton
        @click="model = MALE_SELECTOR"
        :type="model === MALE_SELECTOR ? 'primary' : 'default'"
        class="rounded-l-xl!"
        >Male</ElButton
      >
      <ElButton
        @click="model = FEMALE_SELECTOR"
        :type="model === FEMALE_SELECTOR ? 'primary' : 'default'"
        class="rounded-r-xl!"
        >Female</ElButton
      >
    </ElButtonGroup>
  </div>
</template>
