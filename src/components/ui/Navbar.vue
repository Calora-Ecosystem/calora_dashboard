<script setup lang="ts">
import { reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import MenuItem from "../MenuItem.vue";
import { useAppStore } from "../../stores/appStore";

const router = useRouter();
const currentRoute = useRoute();
const appStore = useAppStore();

const expanded = reactive<Record<string, boolean>>({});

const navigate = (path: string) => {
  router.push({ path });
  appStore.isMobileMenuOpen = false;
};

const onItemClick = (item: { path: string; children?: unknown }) => {
  if (item.children) {
    expanded[item.path] = !expanded[item.path];
    return;
  }
  navigate(item.path);
};

const isExpanded = (item: { path: string; children?: unknown }) => {
  return expanded[item.path] ?? currentRoute.path.startsWith(item.path);
};

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
    children: [
      { label: "Xabarlar", path: "/notifications/messages" },
    ],
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

</script>

<template>
  <div class="w-full h-full flex flex-col min-h-0">
    <div class="flex p-5 shrink-0">
      <svg-icon icon="brand.svg" />
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-y-0 mt-1 pb-4">
      <template v-for="item in menuItems" :key="item.path">
        <MenuItem
          :icon="item.icon"
          :is-active="currentRoute.path.startsWith(item.path)"
          @click="() => onItemClick(item)"
        >
          {{ router.resolve(item.path).name ?? "change me" }}
        </MenuItem>
        <div
          v-if="item.children && isExpanded(item)"
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
            @click="() => navigate(child.path)"
          >
            {{ child.label }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
