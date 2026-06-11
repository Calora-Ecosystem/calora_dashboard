<script setup>
import Header from "../../components/ui/Header.vue";
import Navbar from "../../components/ui/Navbar.vue";
import ScreenLayout from "./ScreenLayout.vue";
import { useAppStore } from "../../stores/appStore";

const appStore = useAppStore();
</script>

<template>
  <ScreenLayout>
    <div class="w-full h-full flex overflow-hidden relative" style="background: var(--bg)">
      <!-- Sidebar (desktop) -->
      <div class="shrink-0 w-[256px] hidden lg:block">
        <Navbar />
      </div>

      <!-- Sidebar (mobile overlay) -->
      <transition name="fade">
        <div
          v-if="appStore.isMobileMenuOpen"
          class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          @click="appStore.isMobileMenuOpen = false"
        ></div>
      </transition>
      <div
        class="fixed top-0 left-0 z-50 h-full w-[268px] shadow-2xl transition-transform duration-250 lg:hidden"
        :class="appStore.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <Navbar />
      </div>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0">
        <div class="h-[72px] shrink-0 z-10">
          <Header />
        </div>

        <main
          class="flex-1 min-h-0 overflow-y-auto px-4 py-5 lg:px-8 lg:py-7"
          style="background: var(--bg)"
        >
          <div class="max-w-[1500px] mx-auto animate-fade-up">
            <router-view />
          </div>
        </main>
      </div>
    </div>
  </ScreenLayout>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
