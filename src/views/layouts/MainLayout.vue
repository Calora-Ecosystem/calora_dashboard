<script setup>
import { useRouter } from "vue-router";
import Header from "../../components/ui/Header.vue";
import Navbar from "../../components/ui/Navbar.vue";
import ScreenLayout from "./ScreenLayout.vue";

const router = useRouter();
</script>

<template>
  <ScreenLayout>
    <div class="w-full h-full flex overflow-hidden">
      <!-- Sidebar -->
      <div class="shrink-0 w-[241px]">
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
          class="flex-1 min-h-0 overflow-y-auto bg-[#F5F6FA] border border-gray-200 p-2 px-10"
        >
          <h1 class="text-[32px] font-semibold mb-5 mt-3">
            {{ router.currentRoute.value.name?.toUpperCase() }}
          </h1>
          <router-view />
        </div>
      </div>
    </div>
  </ScreenLayout>
</template>
