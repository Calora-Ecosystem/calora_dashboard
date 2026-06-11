<script setup>
import ScreenLayout from "./ScreenLayout.vue";
import { useThemeStore } from "../../stores/themeStore";

const themeStore = useThemeStore();

const features = [
  "Foydalanuvchilar va savdolar real vaqt analitikasi",
  "Kurslar, mashqlar va kaloriyalarni boshqarish",
  "Premium obunalar va billing nazorati",
];
</script>

<template>
  <ScreenLayout>
    <div class="w-full h-full flex" style="background: var(--bg)">
      <!-- Brand panel (desktop) -->
      <div
        class="hidden lg:flex flex-col justify-between w-[46%] xl:w-[42%] p-12 relative overflow-hidden"
        style="background: linear-gradient(150deg, #6ba739 0%, #7cc243 45%, #5d9a30 100%)"
      >
        <!-- decorative blobs -->
        <div class="absolute -top-24 -right-20 w-96 h-96 rounded-full" style="background: rgba(255,255,255,0.12)"></div>
        <div class="absolute -bottom-32 -left-16 w-[26rem] h-[26rem] rounded-full" style="background: rgba(255,255,255,0.08)"></div>

        <div class="relative z-10 brand-logo-light">
          <svg-icon icon="brand.svg" />
        </div>

        <div class="relative z-10">
          <h2 class="text-white text-[34px] xl:text-[40px] font-bold leading-tight tracking-tight">
            Sog'lom hayot<br />boshqaruvi shu yerda
          </h2>
          <p class="text-white/80 mt-4 text-[15px] max-w-md leading-relaxed">
            Calora admin panel — foydalanuvchilaringiz, savdolaringiz va
            kontentingizni bitta professional joydan boshqaring.
          </p>

          <ul class="mt-8 space-y-3.5">
            <li v-for="f in features" :key="f" class="flex items-center gap-3 text-white/95 text-[14.5px]">
              <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              {{ f }}
            </li>
          </ul>
        </div>

        <p class="relative z-10 text-white/70 text-[13px]">
          © {{ new Date().getFullYear() }} Calora. Barcha huquqlar himoyalangan.
        </p>
      </div>

      <!-- Form panel -->
      <div class="flex-1 flex flex-col relative">
        <!-- top bar -->
        <div class="flex items-center justify-between p-5 lg:p-6">
          <div class="lg:hidden brand-logo">
            <svg-icon icon="brand.svg" />
          </div>
          <div class="flex-1"></div>
          <button class="theme-btn" @click="themeStore.toggle()" aria-label="Theme">
            <svg v-if="themeStore.mode === 'dark'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>

        <!-- centered form -->
        <div class="flex-1 flex items-center justify-center px-5 pb-12">
          <div class="w-full max-w-[400px] animate-fade-up">
            <router-view />
          </div>
        </div>
      </div>
    </div>
  </ScreenLayout>
</template>

<style scoped>
.brand-logo-light :deep(svg) {
  height: 34px;
  width: auto;
}
.brand-logo-light :deep(path[fill="#072532"]) {
  fill: #ffffff;
}
.theme-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.theme-btn:hover {
  color: var(--brand-strong);
  background: var(--surface-hover);
}
</style>
