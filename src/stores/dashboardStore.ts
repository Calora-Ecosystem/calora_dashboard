import { defineStore } from "pinia";
import { useApiCallStore } from "./apiCallStore";
import { axios } from "../integrations/axios";
import { ref } from "vue";

export type PlanBreakdown = { plan: number; count: number };
export type DailyCount = { date: string; count: number };

export type UserStatistics = {
  totalUsers: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  newTodayGrows: number;
  newThisWeekGrows: number;
  newThisMonthGrows: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  premiumUsers: number;
  freeUsers: number;
  planBreakdown: PlanBreakdown[];
  dailyRegistrations: DailyCount[];
  dailyActiveUsers: DailyCount[];
  monthlyRegistrations: Record<string, number>;
};

export type UserStatisticsRange = {
  from: string;
  to: string;
  registered: number;
  activeUsers: number;
  signInCount: number;
  newPremium: number;
  dailyRegistrations: DailyCount[];
  dailyActiveUsers: DailyCount[];
  dailyPremium: DailyCount[];
};

export const useDashboardStore = defineStore("dashboard", () => {
  const { execute } = useApiCallStore();

  const overallSummary = ref();
  const salesMonthlySummary = ref<Record<string, number>>();
  const subscriptionOrders = ref();
  const userStatistics = ref<UserStatistics>();

  const loadOverallSummary = async () => {
    await execute(async () => {
      const response = await axios.get("/dashboard/summary");
      overallSummary.value = response.data.content;
    });
  };

  const loadSalesMonthlySummary = async () => {
    await execute(async () => {
      const response = await axios.get("/dashboard/sales/summary");
      salesMonthlySummary.value = response.data.content;
    });
  };

  const loadUserStatistics = async () => {
    await execute(async () => {
      const response = await axios.get("/dashboard/users/statistics");
      userStatistics.value = response.data.content;
    });
  };

  const loadUserStatisticsRange = async (
    from: string,
    to: string,
  ): Promise<UserStatisticsRange | undefined> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/users/statistics/range", {
        params: { from, to },
      });
      return response.data.content as UserStatisticsRange;
    });
  };

  const loadSubscriptionOrders = async (
    skip: number = 0,
    take: number = 10,
  ) => {
    return await execute(async () => {
      return (
        await axios.get("/dashboard/orders/subscriptions", {
          params: { skip, take },
        })
      ).data;
    });
  };

  // Real revenue breakdown grouped by plan, derived from recent subscription
  // orders (no dedicated endpoint yet, so we aggregate client-side).
  const revenueByPlan = ref<{ plan: string; amount: number; count: number }[]>(
    [],
  );

  const loadRevenueByPlan = async (sample: number = 100) => {
    await execute(async () => {
      const { content } = (
        await axios.get("/dashboard/orders/subscriptions", {
          params: { skip: 0, take: sample },
        })
      ).data;

      const map = new Map<string, { amount: number; count: number }>();
      for (const o of content ?? []) {
        const plan = o.plan || "Boshqa";
        const entry = map.get(plan) ?? { amount: 0, count: 0 };
        entry.amount += Number(o.amount) || 0;
        entry.count += 1;
        map.set(plan, entry);
      }
      revenueByPlan.value = Array.from(map.entries())
        .map(([plan, v]) => ({ plan, ...v }))
        .sort((a, b) => b.amount - a.amount);
    });
  };

  return {
    overallSummary,
    salesMonthlySummary,
    subscriptionOrders,
    userStatistics,
    revenueByPlan,
    loadOverallSummary,
    loadSalesMonthlySummary,
    loadUserStatistics,
    loadUserStatisticsRange,
    loadSubscriptionOrders,
    loadRevenueByPlan,
  };
});
