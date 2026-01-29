<script setup lang="ts">
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
    path: "/video-course",
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
];
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex p-5">
      <svg-icon icon="brand.svg" />
    </div>
    <div class="flex flex-col gap-y-2 mt-2">
      <MenuItem
        v-for="item in menuItems"
        :key="item.path"
        :icon="item.icon"
        :is-active="currentRoute.path.startsWith(item.path)"
        @click="() => router.push({ path: item.path })"
      >
        {{ router.resolve(item.path).name ?? "change me" }}
      </MenuItem>
    </div>
  </div>
</template>
