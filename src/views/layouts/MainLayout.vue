<script setup>
import { useRouter } from "vue-router";
import Header from "../../components/ui/Header.vue";
import Navbar from "../../components/ui/Navbar.vue";
import ScreenLayout from "./ScreenLayout.vue";
import { useAppStore } from "../../stores/appStore";

const router = useRouter();
const appStore = useAppStore();
</script>

<template>
  <ScreenLayout>
    <div class="w-full h-full flex overflow-hidden relative">
      <!-- Sidebar (desktop) -->
      <div class="shrink-0 w-[241px] hidden lg:block">
        <Navbar />
      </div>

      <!-- Sidebar (mobile overlay) -->
      <div
        v-if="appStore.isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-black/40 lg:hidden"
        @click="appStore.isMobileMenuOpen = false"
      ></div>
      <div
        class="fixed top-0 left-0 z-50 h-full w-[260px] bg-white shadow-xl transition-transform duration-200 lg:hidden"
        :class="appStore.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <Navbar />
      </div>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0">
        <!-- Header -->
        <div class="h-[80px] shrink-0">
          <Header />
        </div>

        <!-- Scrollable content -->
        <div
          class="flex-1 min-h-0 overflow-y-auto bg-[#F5F6FA] border border-gray-200 p-2 px-4 lg:px-10"
        >
          <h1 class="text-[24px] lg:text-[32px] font-semibold mb-5 mt-3">
            {{ router.currentRoute.value.name?.toUpperCase() }}
          </h1>
          <router-view />
        </div>
      </div>
    </div>
  </ScreenLayout>
</template>
