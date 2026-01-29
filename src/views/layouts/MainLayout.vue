<script setup>
import { useRouter } from "vue-router";
import Header from "../../components/ui/header.vue";
import Navbar from "../../components/ui/Navbar.vue";
import ScreenLayout from "./ScreenLayout.vue";

const router = useRouter();
</script>

<template>
  <ScreenLayout>
    <div class="w-full h-full flex flex-row">
      <div class="flex-2 shrink-0 min-w-[241px]">
        <Navbar />
      </div>
      <div class="flex-10 flex flex-col">
        <div class="flex-1 shrink-0">
          <Header />
        </div>
        <div
          class="flex-11 bg-[#F5F6FA] border border-solid border-gray-200 p-2 px-10"
        >
          <h1 class="text-[32px] font-semibold mb-5 mt-3">
            {{ router.currentRoute.value.name?.toLocaleUpperCase() }}
          </h1>
          <router-view />
        </div>
      </div>
    </div>
  </ScreenLayout>
</template>
