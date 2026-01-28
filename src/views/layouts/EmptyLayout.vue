<script setup>
import ScreenLayout from "./ScreenLayout.vue";
</script>
<template>
  <ScreenLayout>
    <div class="w-full h-full justify-center items-center flex">
      <router-view />
    </div>
  </ScreenLayout>
</template>
