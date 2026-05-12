<script setup lang="ts">
import { computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import MenuItem from "../MenuItem.vue";
import { useAppStore } from "../../stores/appStore";
import { useTokenStore } from "../../stores/tokenStore";

const router = useRouter();
const currentRoute = useRoute();
const appStore = useAppStore();
const tokenStore = useTokenStore();

type MenuChild = { path: string; label?: string };
type MenuEntry = {
  icon: string;
  path: string;
  label?: string;
  roles?: string[];
  children?: MenuChild[];
};

const expanded = reactive<Record<string, boolean>>({});

const navigate = (path: string) => {
  router.push({ path });
  appStore.isMobileMenuOpen = false;
};

const onItemClick = (item: MenuEntry) => {
  if (item.children) {
    expanded[item.path] = !expanded[item.path];
    return;
  }
  navigate(item.path);
};

const isExpanded = (item: MenuEntry) => {
  return expanded[item.path] ?? currentRoute.path.startsWith(item.path);
};

const labelFor = (item: { path: string; label?: string }) => {
  if (item.label) return item.label;
  return router.resolve(item.path).name?.toString() ?? "change me";
};

const menuItems: MenuEntry[] = [
  {
    icon: "navbar/home.svg",
    path: "/dashboard",
    roles: ["SuperAdmin"],
  },
  {
    icon: "navbar/users.svg",
    path: "/users",
    roles: ["SuperAdmin"],
  },
  {
    icon: "navbar/money-bag.svg",
    path: "/sales",
    roles: ["SuperAdmin"],
  },
  {
    icon: "navbar/bookmark.svg",
    path: "/courses",
    roles: ["SuperAdmin"],
  },
  {
    icon: "navbar/calories.svg",
    path: "/calories",
    roles: ["SuperAdmin"],
    children: [{ path: "/calories/categories" }, { path: "/calories/foods" }],
  },
  {
    icon: "navbar/user-stat.svg",
    path: "/premium",
    roles: ["SuperAdmin"],
  },
  {
    icon: "navbar/notification.svg",
    path: "/notifications",
    roles: ["SuperAdmin"],
    children: [{ path: "/notifications/messages" }],
  },
  {
    icon: "navbar/preference.svg",
    path: "/references",
    roles: ["SuperAdmin"],
  },
  {
    icon: "navbar/user-edit.svg",
    path: "/team",
    roles: ["SuperAdmin"],
  },
  {
    icon: "navbar/money-bag.svg",
    path: "/billing",
    label: "Billing",
    roles: ["SuperAdmin"],
    children: [{ path: "/billing/coupons" }],
  },
  {
    icon: "navbar/users.svg",
    path: "/crm/leads",
    label: "Leadlar",
    roles: ["Operator"],
  },
];

const visibleMenuItems = computed(() =>
  menuItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.some((r) => tokenStore.hasRole(r));
  }),
);
</script>

<template>
  <div class="w-full h-full flex flex-col min-h-0">
    <div class="flex p-5 shrink-0">
      <svg-icon icon="brand.svg" />
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-y-0 mt-1 pb-4">
      <template v-for="item in visibleMenuItems" :key="item.path">
        <MenuItem
          :icon="item.icon"
          :is-active="currentRoute.path.startsWith(item.path)"
          @click="() => onItemClick(item)"
        >
          {{ labelFor(item) }}
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
              'bg-[#7CC243] text-white': currentRoute.path.startsWith(
                child.path,
              ),
              'text-gray-600 hover:bg-gray-100': !currentRoute.path.startsWith(
                child.path,
              ),
            }"
            @click="() => navigate(child.path)"
          >
            {{ labelFor(child) }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
