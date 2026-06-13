<script setup lang="ts">
import { computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "../../stores/appStore";
import { useTokenStore } from "../../stores/tokenStore";

const router = useRouter();
const currentRoute = useRoute();
const appStore = useAppStore();
const tokenStore = useTokenStore();

type MenuChild = { path: string; label: string };
type MenuEntry = {
  icon: string;
  path: string;
  label: string;
  roles?: string[];
  children?: MenuChild[];
};
type Section = { title: string; items: MenuEntry[] };

const expanded = reactive<Record<string, boolean>>({});

const navigate = (path: string) => {
  router.push({ path });
  appStore.isMobileMenuOpen = false;
};

const onItemClick = (item: MenuEntry) => {
  if (item.children) {
    expanded[item.path] = !isExpanded(item);
    return;
  }
  navigate(item.path);
};

const isExpanded = (item: MenuEntry) =>
  expanded[item.path] ?? currentRoute.path.startsWith(item.path);

const isActive = (path: string) => currentRoute.path.startsWith(path);

const sections: Section[] = [
  {
    title: "Asosiy",
    items: [
      { icon: "navbar/home.svg", path: "/dashboard", label: "Dashboard", roles: ["SuperAdmin"] },
      { icon: "navbar/users.svg", path: "/users", label: "Foydalanuvchilar", roles: ["SuperAdmin"] },
      { icon: "navbar/money-bag.svg", path: "/sales", label: "Savdolar", roles: ["SuperAdmin"] },
    ],
  },
  {
    title: "Kontent",
    items: [
      { icon: "navbar/bookmark.svg", path: "/courses", label: "Kurslar", roles: ["SuperAdmin"] },
      {
        icon: "navbar/calories.svg",
        path: "/calories",
        label: "Kaloriyalar",
        roles: ["SuperAdmin"],
        children: [
          { path: "/calories/categories", label: "Kategoriyalar" },
          { path: "/calories/foods", label: "Taomlar" },
        ],
      },
      {
        icon: "navbar/notification.svg",
        path: "/notifications",
        label: "Bildirishnomalar",
        roles: ["SuperAdmin"],
        children: [{ path: "/notifications/messages", label: "Xabarlar" }],
      },
      { icon: "navbar/preference.svg", path: "/references", label: "Ma'lumotnomalar", roles: ["SuperAdmin"] },
    ],
  },
  {
    title: "Boshqaruv",
    items: [
      { icon: "navbar/user-edit.svg", path: "/team", label: "Jamoa", roles: ["SuperAdmin"] },
      {
        icon: "navbar/money-bag.svg",
        path: "/billing",
        label: "Billing",
        roles: ["SuperAdmin"],
        children: [
          { path: "/billing/coupons", label: "Kuponlar" },
          { path: "/billing/plans", label: "Obuna tariflari" },
        ],
      },
    ],
  },
  {
    title: "CRM",
    items: [
      { icon: "navbar/home.svg", path: "/crm/dashboard", label: "Boshqaruv paneli", roles: ["Operator"] },
      { icon: "navbar/users.svg", path: "/crm/leads", label: "Leadlar", roles: ["Operator"] },
      { icon: "navbar/notification.svg", path: "/crm/followups", label: "Follow-uplar", roles: ["Operator"] },
      { icon: "navbar/money-bag.svg", path: "/crm/my-stats", label: "Statistikam", roles: ["Operator"] },
    ],
  },
  {
    title: "Sotuv boshqaruvi",
    items: [
      { icon: "navbar/home.svg", path: "/crm/sales", label: "Analitika", roles: ["HeadOfSales", "SuperAdmin"] },
      { icon: "navbar/user-edit.svg", path: "/crm/sales/operators", label: "Operatorlar", roles: ["HeadOfSales", "SuperAdmin"] },
      { icon: "navbar/money-bag.svg", path: "/crm/sales/leaderboard", label: "Reyting", roles: ["HeadOfSales", "SuperAdmin"] },
    ],
  },
];

const canSee = (item: MenuEntry) =>
  !item.roles?.length || item.roles.some((r) => tokenStore.hasRole(r));

const visibleSections = computed(() =>
  sections
    .map((s) => ({ ...s, items: s.items.filter(canSee) }))
    .filter((s) => s.items.length > 0),
);
</script>

<template>
  <aside
    class="w-full h-full flex flex-col min-h-0"
    style="background: var(--sidebar); border-right: 1px solid var(--border)"
  >
    <!-- Brand -->
    <div class="flex items-center px-5 h-[72px] shrink-0">
      <span class="brand-logo">
        <svg-icon icon="brand.svg" />
      </span>
    </div>

    <!-- Nav -->
    <nav class="flex-1 min-h-0 overflow-y-auto px-3 pb-6 mt-2">
      <template v-for="section in visibleSections" :key="section.title">
        <p
          class="px-3 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider"
          style="color: var(--text-faint)"
        >
          {{ section.title }}
        </p>

        <template v-for="item in section.items" :key="item.path">
          <button
            class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 relative"
            :class="isActive(item.path) ? 'is-active' : 'nav-idle'"
            @click="onItemClick(item)"
          >
            <span class="nav-icon shrink-0 flex items-center justify-center w-5 h-5">
              <svg-icon :icon="item.icon" class="w-5 h-5" />
            </span>
            <span class="flex-1 text-left truncate">{{ item.label }}</span>
            <svg
              v-if="item.children"
              class="w-4 h-4 transition-transform duration-200 opacity-60"
              :class="{ 'rotate-90': isExpanded(item) }"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <transition name="submenu">
            <div v-if="item.children && isExpanded(item)" class="ml-5 pl-3 my-1 flex flex-col gap-0.5"
              style="border-left: 1.5px solid var(--border)">
              <button
                v-for="child in item.children"
                :key="child.path"
                class="text-left text-[13px] px-3 py-2 rounded-lg transition-colors"
                :class="isActive(child.path) ? 'child-active' : 'child-idle'"
                @click="navigate(child.path)"
              >
                {{ child.label }}
              </button>
            </div>
          </transition>
        </template>
      </template>
    </nav>
  </aside>
</template>

<style scoped>
.nav-idle {
  color: var(--text-muted);
}
.nav-idle:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.nav-idle .nav-icon :deep(svg) {
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  color: inherit;
}
.is-active {
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  color: #fff;
  box-shadow: 0 6px 16px rgba(var(--brand-rgb), 0.35);
}
.is-active .nav-icon :deep(svg) {
  stroke: #fff;
  stroke-width: 2;
  fill: none;
}

.child-idle {
  color: var(--text-muted);
}
.child-idle:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.child-active {
  background: var(--brand-soft);
  color: var(--brand-strong);
  font-weight: 600;
}

.submenu-enter-active,
.submenu-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  max-height: 0;
}
.submenu-enter-to,
.submenu-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
