<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import MenuItem from "../MenuItem.vue";

const router = useRouter();
const currentRoute = useRoute();

const menuItems = [
  {
    icon: "navbar/home.svg",
    path: "/dashboard",
  },
  {
    icon: "navbar/users.svg",
    path: "/users",
  },
  {
    icon: "navbar/money-bag.svg",
    path: "/sales",
  },
  {
    icon: "navbar/bookmark.svg",
    path: "/courses",
  },
  {
    icon: "navbar/calories.svg",
    path: "/calories",
    children: [
      { label: "Kategoriyalar", path: "/calories/categories" },
      { label: "Taomlar", path: "/calories/foods" },
    ],
  },
  {
    icon: "navbar/user-stat.svg",
    path: "/premium",
  },
  {
    icon: "navbar/notification.svg",
    path: "/notifications",
  },
  {
    icon: "navbar/preference.svg",
    path: "/references",
  },
  {
    icon: "navbar/user-edit.svg",
    path: "/team",
  },
  {
    icon: "navbar/money-bag.svg",
    path: "/billing",
    children: [
      { label: "Kuponlar", path: "/billing/coupons" },
    ],
  },
];

const isCaloriesOpen = computed(() =>
  currentRoute.path.startsWith("/calories")
);

const isBillingOpen = computed(() =>
  currentRoute.path.startsWith("/billing")
);
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex p-5">
      <svg-icon icon="brand.svg" />
    </div>
    <div class="flex flex-col gap-y-2 mt-2">
      <template v-for="item in menuItems" :key="item.path">
        <MenuItem
          :icon="item.icon"
          :is-active="currentRoute.path.startsWith(item.path)"
          @click="() => router.push({ path: item.path })"
        >
          {{ router.resolve(item.path).name ?? "change me" }}
        </MenuItem>
        <div
          v-if="item.children && ((isCaloriesOpen && item.path === '/calories') || (isBillingOpen && item.path === '/billing'))"
          class="flex flex-col gap-y-1 pl-8"
        >
          <div
            v-for="child in item.children"
            :key="child.path"
            class="cursor-pointer text-sm px-3 py-1.5 rounded-md transition-colors"
            :class="{
              'bg-[#7CC243] text-white': currentRoute.path.startsWith(child.path),
              'text-gray-600 hover:bg-gray-100': !currentRoute.path.startsWith(child.path),
            }"
            @click="() => router.push({ path: child.path })"
          >
            {{ child.label }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
