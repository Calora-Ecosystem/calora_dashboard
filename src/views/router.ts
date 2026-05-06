import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { pa } from "element-plus/es/locale/index.mjs";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    beforeEnter: (to, from, next) => {
      if (to.path === "/") return next({ name: "dashboard" });

      return next();
    },
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
            path: "courses",
            children: [
              {
                name: "course",
                path: "",
                component: () => import("./course/VideoCourse.vue"),
              },
              {
                path: "create",
                name: "course_create",
                component: () => import("./course/CourseEdit.vue"),
              },
              {
                path: ":courseId",
                name: "course_edit",
                component: () => import("./course/CourseEdit.vue"),
              },
              {
                path: ":courseId/workouts",
                children: [
                  {
                    path: "",
                    name: "workouts",
                    component: () => import("./course/Workouts.vue"),
                  },
                  {
                    path: "create",
                    name: "workout_create",
                    component: () => import("./course/WorkoutEdit.vue"),
                  },
                  {
                    path: ":workoutId",
                    name: "workout_edit",
                    component: () => import("./course/WorkoutEdit.vue"),
                  },
                  {
                    path: ":workoutId/exercises",
                    children: [
                      {
                        path: "",
                        name: "exercises",
                        component: () => import("./course/Exercises.vue"),
                      },
                      {
                        path: "create",
                        name: "exercises_create",
                        component: () => import("./course/ExerciseEdit.vue"),
                      },
                      {
                        path: ":exerciseId",
                        name: "exercise_edit",
                        component: () => import("./course/ExerciseEdit.vue"),
                      },
                    ],
                  },
                ],
              },
              {
                path: ":courseId/lessons",
                children: [
                  {
                    path: "",
                    name: "lessons",
                    component: () => import("./course/Lessons.vue"),
                  },
                  {
                    path: ":lessonId",
                    name: "lesson_edit",
                    component: () => import("./course/LessonEdit.vue"),
                  },
                  {
                    path: "create",
                    name: "lesson_create",
                    component: () => import("./course/LessonEdit.vue"),
                  },
                ],
              },
            ],
          },
          {
            path: "calories",
            children: [
              {
                path: "",
                name: "calories",
                component: () => import("./calories/Index.vue"),
              },
              {
                path: "categories",
                children: [
                  {
                    path: "",
                    name: "food_categories",
                    component: () => import("./calories/FoodCategories.vue"),
                  },
                  {
                    path: "create",
                    name: "category_create",
                    component: () => import("./calories/FoodCategoryEdit.vue"),
                  },
                  {
                    path: ":categoryId",
                    name: "category_edit",
                    component: () => import("./calories/FoodCategoryEdit.vue"),
                  },
                ],
              },
              {
                path: "foods",
                children: [
                  {
                    path: "",
                    name: "foods",
                    component: () => import("./calories/Foods.vue"),
                  },
                  {
                    path: "create",
                    name: "food_create",
                    component: () => import("./calories/FoodEdit.vue"),
                  },
                  {
                    path: ":foodId",
                    name: "food_edit",
                    component: () => import("./calories/FoodEdit.vue"),
                  },
                ],
              },
            ],
          },
          {
            name: "premium",
            path: "premium",
            component: () => import("./home/Premium.vue"),
          },
          {
            name: "notifications",
            path: "notifications",
            component: () => import("./home/Notifications.vue"),
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
          {
            path: "billing",
            children: [
              {
                path: "coupons",
                name: "coupons",
                component: () => import("./billing/Coupons.vue"),
              },
              {
                path: "coupons/create",
                name: "coupon_create",
                component: () => import("./billing/CouponCreate.vue"),
              },
              {
                path: "coupons/:couponId",
                name: "coupon_edit",
                component: () => import("./billing/CouponCreate.vue"),
              },
              {
                path: "coupons/:couponId/usages",
                name: "coupon_usages",
                component: () => import("./billing/CouponUsages.vue"),
              },
            ],
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

console.log((import.meta as any).env);

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return {
        ...savedPosition,
        behavior: "smooth",
      };
    }
    return { top: 0, behavior: "smooth" };
  },
});
