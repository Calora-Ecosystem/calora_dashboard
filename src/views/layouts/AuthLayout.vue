<script setup>
import ScreenLayout from "./ScreenLayout.vue";
</script>
<template>
  <ScreenLayout>
    <div
      class="w-full h-full bg-[url('/images/main-bg.svg')] flex items-center justify-center"
    >
      <div class="bg-white rounded-xl p-4 min-w-70 shadow-lg">
        <router-view />
      </div>
    </div>
  </ScreenLayout>
</template>
