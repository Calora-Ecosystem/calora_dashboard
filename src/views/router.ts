import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { useAuthStore } from "../stores/authStore";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    children: [
      {
        path: "",
        component: () => import("./layouts/MainLayout.vue"),
        beforeEnter: (from, to, next) => {
          const authStore = useAuthStore();
          if (!authStore.isAuthenticated) return next("/auth/sign-in");

          return next();
        },
        children: [
          {
            name: "dashboard",
            path: "dashboard",
            component: () => import("./home/Dashboard.vue"),
          },
          {
            name: "users",
            path: "users",
            component: () => import("./home/Users.vue"),
          },
          {
            name: "sales",
            path: "sales",
            component: () => import("./home/Sales.vue"),
          },
          {
            name: "video_course",
            path: "video-course",
            component: () => import("./home/VideoCourse.vue"),
          },
          {
            name: "premium",
            path: "premium",
            component: () => import("./home/Premium.vue"),
          },
          {
            name: "notifications",
            path: "notifications",
            component: () => import("./home/notifications.vue"),
          },
          {
            name: "references",
            path: "references",
            component: () => import("./home/References.vue"),
          },
          {
            name: "team",
            path: "team",
            component: () => import("./home/Team.vue"),
          },
        ],
      },
      {
        path: "auth",
        component: () => import("./layouts/AuthLayout.vue"),
        beforeEnter: (to, from, next) => {
          const authStore = useAuthStore();
          if (authStore.isAuthenticated) return next({ name: "home" });
          if (to.path == "/auth") return next("/auth/sign-in");
          next();
        },
        children: [
          {
            path: "sign-in",
            component: () => import("./auth/SignIn.vue"),
          },
        ],
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("./layouts/EmptyLayout.vue"),
    children: [
      {
        path: "",
        name: "default",
        component: () => import("./common/NotFound.vue"),
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
