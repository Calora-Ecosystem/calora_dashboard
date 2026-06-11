<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed, watch } from "vue";
import Profile from "./Profile.vue";
import { useAppStore } from "../../stores/appStore";
import { useThemeStore } from "../../stores/themeStore";

const appStore = useAppStore();
const themeStore = useThemeStore();
const route = useRoute();

// Pages that consume the global search box
const searchablePages: Record<string, string> = {
  foods: "Taom nomidan qidirish...",
  food_categories: "Kategoriya nomidan qidirish...",
};

const isSearchable = computed(() =>
  Boolean(searchablePages[route.name?.toString() ?? ""]),
);

const searchPlaceholder = computed(
  () => searchablePages[route.name?.toString() ?? ""] ?? "Qidirish...",
);

// Reset the query whenever we navigate to another page
watch(
  () => route.path,
  () => {
    appStore.search = "";
  },
);

const titleMap: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Foydalanuvchilar",
  sales: "Savdolar",
  premium: "Premium",
  course: "Kurslar",
  course_create: "Kurslar",
  course_edit: "Kurslar",
  workouts: "Mashqlar",
  workout_create: "Mashqlar",
  workout_edit: "Mashqlar",
  exercises: "Mashqlar",
  exercises_create: "Mashqlar",
  exercise_edit: "Mashqlar",
  lessons: "Darslar",
  lesson_create: "Darslar",
  lesson_edit: "Darslar",
  calories: "Kaloriyalar",
  food_categories: "Kategoriyalar",
  category_create: "Kategoriyalar",
  category_edit: "Kategoriyalar",
  foods: "Taomlar",
  food_create: "Taomlar",
  food_edit: "Taomlar",
  notifications: "Bildirishnomalar",
  reminder_messages: "Eslatma xabarlari",
  reminder_message_create: "Eslatma xabarlari",
  reminder_message_edit: "Eslatma xabarlari",
  references: "Ma'lumotnomalar",
  team: "Jamoa",
  coupons: "Kuponlar",
  coupon_create: "Kuponlar",
  coupon_edit: "Kuponlar",
  coupon_usages: "Kuponlar",
  crm_leads: "Leadlar",
};

const pageTitle = computed(() => {
  const name = route.name?.toString() ?? "";
  return titleMap[name] ?? name.replace(/_/g, " ");
});
</script>

<template>
  <header
    class="h-full flex items-center justify-between gap-3 px-4 lg:px-8"
    style="background: var(--surface); border-bottom: 1px solid var(--border)"
  >
    <!-- Left: mobile menu + title -->
    <div class="flex items-center gap-3 min-w-0">
      <button
        class="lg:hidden p-2 rounded-lg transition-colors"
        style="color: var(--text-muted)"
        aria-label="Menu"
        @click="appStore.isMobileMenuOpen = !appStore.isMobileMenuOpen"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div class="min-w-0">
        <h1 class="text-[18px] lg:text-[22px] font-bold capitalize truncate" style="color: var(--text)">
          {{ pageTitle }}
        </h1>
        <p class="hidden sm:block text-[12px]" style="color: var(--text-faint)">
          Xush kelibsiz, bugungi ko'rsatkichlar
        </p>
      </div>
    </div>

    <!-- Center: search (desktop) -->
    <div class="hidden md:flex flex-1 max-w-md mx-2">
      <div
        class="flex items-center gap-2 w-full px-3.5 h-10 rounded-xl transition-opacity"
        :class="isSearchable ? '' : 'opacity-55'"
        style="background: var(--surface-2); border: 1px solid var(--border)"
      >
        <svg class="w-4 h-4 shrink-0" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="appStore.search"
          type="text"
          :placeholder="searchPlaceholder"
          :disabled="!isSearchable"
          class="bg-transparent outline-none text-[14px] w-full disabled:cursor-not-allowed"
          style="color: var(--text)"
        />
        <button
          v-if="appStore.search"
          class="shrink-0 p-0.5 rounded-md transition-colors"
          style="color: var(--text-faint)"
          aria-label="Tozalash"
          @click="appStore.search = ''"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Right: actions -->
    <div class="flex items-center gap-1.5 sm:gap-2.5">
      <!-- Theme toggle -->
      <button
        class="icon-btn"
        :aria-label="themeStore.mode === 'dark' ? 'Light mode' : 'Dark mode'"
        @click="themeStore.toggle()"
      >
        <svg v-if="themeStore.mode === 'dark'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

      <!-- Notifications -->
      <button class="icon-btn relative" aria-label="Notifications">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style="background: var(--danger)"></span>
      </button>

      <div class="hidden sm:block w-px h-8 mx-1" style="background: var(--border)"></div>

      <Profile />
    </div>
  </header>
</template>

<style scoped>
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.icon-btn:hover {
  color: var(--brand-strong);
  background: var(--surface-hover);
}
</style>
