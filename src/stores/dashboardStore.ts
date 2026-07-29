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

export type HourCount = { hour: number; count: number };
export type WeekdayCount = { weekday: number; count: number };
export type GenderCount = { gender: string; count: number };
export type AgeGroupCount = { group: string; count: number };
export type EnumCount = { value: number; name: string; count: number };

export type AudienceAnalytics = {
  totalUsers: number;
  profiledUsers: number;
  hourlyRegistrations: HourCount[];
  weekdayRegistrations: WeekdayCount[];
  peakHour: number | null;
  genderBreakdown: GenderCount[];
  ageGroups: AgeGroupCount[];
  purposeBreakdown: EnumCount[];
  activityLevelBreakdown: EnumCount[];
  languageBreakdown: EnumCount[];
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

  const audienceAnalytics = ref<AudienceAnalytics>();

  const loadAudienceAnalytics = async (): Promise<AudienceAnalytics | undefined> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/users/audience");
      audienceAnalytics.value = response.data.content;
      return audienceAnalytics.value;
    });
  };

  const loadSubscriptionOrders = async (
    skip: number = 0,
    take: number = 10,
  ) => {
    return await execute(async () => {
      return (
        await axios.get("/dashboard/orders/subscriptions", {
          params: {
            skip,
            take,
            SortPropName: "createdAt",
            SortDirection: "Descending",
          },
        })
      ).data;
    });
  };

  // Barcha obuna buyurtmalarini sahifalab, eng yangisidan boshlab to'liq olib
  // keladi. Sobit `take` bilan cheklanmaydi — shuning uchun sotuvlar soni oshgani
  // sayin ham so'nggi kunlardagi sotuvlar tushib qolmaydi.
  const loadAllSubscriptionOrders = async (): Promise<any[]> => {
    return await execute(async () => {
      const pageSize = 500;
      let skip = 0;
      let total = Infinity;
      const all: any[] = [];
      while (skip < total) {
        const { content, total: t } = (
          await axios.get("/dashboard/orders/subscriptions", {
            params: {
              skip,
              take: pageSize,
              SortPropName: "createdAt",
              SortDirection: "Descending",
            },
          })
        ).data;
        const rows = content ?? [];
        all.push(...rows);
        total = typeof t === "number" ? t : all.length;
        if (!rows.length) break;
        skip += pageSize;
      }
      return all;
    });
  };

  // Real revenue breakdown grouped by plan, derived from recent subscription
  // orders (no dedicated endpoint yet, so we aggregate client-side).
  const revenueByPlan = ref<{ plan: string; amount: number; count: number }[]>(
    [],
  );

  const loadRevenueByPlan = async () => {
    await execute(async () => {
      const orders = await loadAllSubscriptionOrders();

      const map = new Map<string, { amount: number; count: number }>();
      for (const o of orders) {
        // Faqat haqiqatda to'langan sotuvlar (tasdiqlangan + summasi > 0).
        // Bekor/kutilayotgan yoki 100% promokod bilan bepul olinganlar
        // tushumga kirmaydi.
        if (o.orderStatus !== "Confirmed" || !(Number(o.amount) > 0)) continue;
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
    audienceAnalytics,
    revenueByPlan,
    loadOverallSummary,
    loadSalesMonthlySummary,
    loadUserStatistics,
    loadUserStatisticsRange,
    loadAudienceAnalytics,
    loadSubscriptionOrders,
    loadAllSubscriptionOrders,
    loadRevenueByPlan,
  };
});
