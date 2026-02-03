<script setup lang="ts">
import { ElButton, ElLink } from "element-plus";
</script>

<template>
  <div
    class="w-125.25 h-41.5 flex flex-row bg-white rounded-[10px] gap-3.75 px-2 py-4"
  >
    <div class="w-38.25 h-36.5 rounded-[10px]"></div>
    <div class="flex flex-col justify-between flex-auto">
      <div>
        <h3 class="text-[18px] font-bold mt-2">Exercise Title</h3>
        <p class="text-[14px] mt-1">Exercise description goes here.</p>
      </div>
      <div class="flex flex-row justify-end gap-x-2">
        <ElButton type="primary">Edit</ElButton>
        <ElLink>
          <ElButton type="default"> Open </ElButton>
        </ElLink>
      </div>
    </div>
  </div>
</template>
