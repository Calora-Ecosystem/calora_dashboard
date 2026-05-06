<script setup lang="ts">
import Profile from "./Profile.vue";
import { useAppStore } from "../../stores/appStore";

const appStore = useAppStore();
</script>

<template>
  <div class="h-full flex flex-row items-center justify-between p-2 px-4 w-full">
    <button
      class="lg:hidden p-2 rounded-md hover:bg-gray-100"
      aria-label="Menu"
      @click="appStore.isMobileMenuOpen = !appStore.isMobileMenuOpen"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
    <div class="flex-1"></div>
    <Profile />
  </div>
</template>
