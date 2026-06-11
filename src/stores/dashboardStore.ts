import { defineStore } from "pinia";
import { useApiCallStore } from "./apiCallStore";
import { axios } from "../integrations/axios";
import { ref } from "vue";

export const useDashboardStore = defineStore("dashboard", () => {
  const { execute } = useApiCallStore();

  const overallSummary = ref();
  const salesMonthlySummary = ref<{ ["string"]: number }>();
  const subscriptionOrders = ref();

  const loadOverallSummary = async () => {
    await execute(async () => {
      const response = await axios.get("/dashboard/summary");
      overallSummary.value = response.data.content;
    });
  };

  const loadSalesMonthlySummary = async () => {
    await execute(async () => {
      // Backend may return 500 for this endpoint; keep it silent and let the
      // chart fall back to its demo series without surfacing a toast.
      const response = await axios.get("/dashboard/sales/summary", {
        silent: true,
      } as any);
      salesMonthlySummary.value = response.data.content;
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
    revenueByPlan,
    loadOverallSummary,
    loadSalesMonthlySummary,
    loadSubscriptionOrders,
    loadRevenueByPlan,
  };
});
