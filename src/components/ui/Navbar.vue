<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import MenuItem from "../MenuItem.vue";

const router = useRouter();
const currentRoute = useRoute();

const menuItems = [
  {
    title: "Home",
    icon: "navbar/home.svg",
    path: "/dashboard",
  },
  {
    title: "Users",
    icon: "navbar/users.svg",
    path: "/users",
  },
  {
    title: "Sales",
    icon: "navbar/money-bag.svg",
    path: "/sales",
  },
  {
    title: "Video course",
    icon: "navbar/bookmark.svg",
    path: "/video-course",
  },
  {
    title: "Premium",
    icon: "navbar/user-stat.svg",
    path: "/premium",
  },
  {
    title: "Notifications",
    icon: "navbar/notification.svg",
    path: "/notifications",
  },
  {
    title: "References",
    icon: "navbar/preference.svg",
    path: "/references",
  },
  {
    title: "Team",
    icon: "navbar/user-edit.svg",
    path: "/team",
  },
];
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex">
      <img class="shrink-0 object-cover h-[90px]" src="/images/brand.png" />
    </div>
    <div class="flex flex-col gap-y-2">
      <MenuItem
        v-for="item in menuItems"
        :key="item.path"
        :icon="item.icon"
        :is-active="currentRoute.path.startsWith(item.path)"
        @click="() => router.push({ path: item.path })"
      >
        {{ item.title }}
      </MenuItem>
    </div>
  </div>
</template>
