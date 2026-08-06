import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useTokenStore } from "../stores/tokenStore";

const adminHome = "/dashboard";
const operatorHome = "/crm/leads";
const salesHome = "/crm/sales";

const resolveHomeForUser = (): string | null => {
  const tokenStore = useTokenStore();
  // Honour the role the user signed in as first.
  switch (tokenStore.activeRole) {
    case "SuperAdmin":
      return adminHome;
    case "HeadOfSales":
      return salesHome;
    case "Operator":
      return operatorHome;
  }
  if (tokenStore.isSuperAdmin) return adminHome;
  if (tokenStore.isHeadOfSales) return salesHome;
  if (tokenStore.isOperator) return operatorHome;
  return null;
};

const SUPER_ADMIN: { roles: string[] } = { roles: ["SuperAdmin"] };
const OPERATOR: { roles: string[] } = { roles: ["Operator"] };
// SuperAdmin has full access to the sales-management area alongside HeadOfSales.
const HEAD_OF_SALES: { roles: string[] } = { roles: ["HeadOfSales", "SuperAdmin"] };

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    beforeEnter: (to, from, next) => {
      if (to.path === "/") {
        const home = resolveHomeForUser();
        return next(home ?? "/auth/sign-in");
      }
      return next();
    },
    children: [
      {
        path: "",
        component: () => import("./layouts/MainLayout.vue"),
        beforeEnter: (to, from, next) => {
          const authStore = useAuthStore();
          if (!authStore.isAuthenticated) return next("/auth/sign-in");

          const tokenStore = useTokenStore();
          const required = (to.meta?.roles as string[] | undefined) ?? [];
          if (required.length === 0) return next();

          // Scope navigation to the role the user signed in as (not just owned roles).
          if (tokenStore.canView(required)) return next();

          const home = resolveHomeForUser();
          if (!home || home === to.path) {
            tokenStore.clearTokens();
            return next("/auth/sign-in");
          }
          return next(home);
        },
        children: [
          {
            name: "dashboard",
            path: "dashboard",
            meta: SUPER_ADMIN,
            component: () => import("./home/Dashboard.vue"),
          },
          {
            name: "users",
            path: "users",
            meta: SUPER_ADMIN,
            component: () => import("./home/Users.vue"),
          },
          {
            name: "sales",
            path: "sales",
            meta: SUPER_ADMIN,
            component: () => import("./home/Sales.vue"),
          },
          {
            path: "courses",
            meta: SUPER_ADMIN,
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
            meta: SUPER_ADMIN,
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
            meta: SUPER_ADMIN,
            component: () => import("./home/Premium.vue"),
          },
          {
            path: "notifications",
            meta: SUPER_ADMIN,
            children: [
              {
                path: "",
                name: "notifications",
                component: () => import("./home/Notifications.vue"),
              },
              {
                path: "messages",
                children: [
                  {
                    path: "",
                    name: "reminder_messages",
                    component: () => import("./reminder/ReminderMessages.vue"),
                  },
                  {
                    path: "create",
                    name: "reminder_message_create",
                    component: () => import("./reminder/ReminderMessageEdit.vue"),
                  },
                  {
                    path: ":messageId",
                    name: "reminder_message_edit",
                    component: () => import("./reminder/ReminderMessageEdit.vue"),
                  },
                ],
              },
            ],
          },
          {
            name: "references",
            path: "references",
            meta: SUPER_ADMIN,
            component: () => import("./home/References.vue"),
          },
          {
            name: "team",
            path: "team",
            meta: SUPER_ADMIN,
            component: () => import("./home/Team.vue"),
          },
          {
            name: "event_logs",
            path: "event-logs",
            meta: SUPER_ADMIN,
            component: () => import("./home/EventLogs.vue"),
          },
          {
            name: "billing",
            path: "billing",
            meta: SUPER_ADMIN,
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
              {
                path: "plans",
                name: "subscriptions",
                component: () => import("./billing/Subscriptions.vue"),
              },
            ],
          },
          {
            path: "crm",
            children: [
              {
                path: "dashboard",
                name: "crm_dashboard",
                meta: OPERATOR,
                component: () => import("./crm/Dashboard.vue"),
              },
              {
                path: "leads",
                name: "crm_leads",
                meta: OPERATOR,
                component: () => import("./crm/Leads.vue"),
              },
              {
                path: "leads/:leadId",
                name: "crm_lead_detail",
                meta: OPERATOR,
                component: () => import("./crm/LeadDetail.vue"),
              },
              {
                path: "followups",
                name: "crm_followups",
                meta: OPERATOR,
                component: () => import("./crm/FollowUps.vue"),
              },
              {
                path: "my-stats",
                name: "crm_my_stats",
                meta: OPERATOR,
                component: () => import("./crm/MyStats.vue"),
              },
              {
                path: "sales",
                name: "crm_sales",
                meta: HEAD_OF_SALES,
                component: () => import("./crm/sales/Dashboard.vue"),
              },
              {
                path: "sales/leads",
                name: "crm_sales_leads",
                meta: HEAD_OF_SALES,
                component: () => import("./crm/sales/Leads.vue"),
              },
              {
                path: "sales/operators",
                name: "crm_sales_operators",
                meta: HEAD_OF_SALES,
                component: () => import("./crm/sales/Operators.vue"),
              },
              {
                path: "sales/operators/:operatorId",
                name: "crm_sales_operator_board",
                meta: HEAD_OF_SALES,
                component: () => import("./crm/sales/OperatorBoard.vue"),
              },
              {
                path: "sales/leaderboard",
                name: "crm_sales_leaderboard",
                meta: HEAD_OF_SALES,
                component: () => import("./crm/sales/Leaderboard.vue"),
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
          if (authStore.isAuthenticated) {
            const home = resolveHomeForUser();
            if (home) return next(home);
          }
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
