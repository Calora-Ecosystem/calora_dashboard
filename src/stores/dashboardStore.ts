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
      const response = await axios.get("/dashboard/sales/summary");
      salesMonthlySummary.value = response.data.content;
    });
  };

  const loadSubscriptionOrders = async () => {
    await execute(async () => {
      const response = await axios.get("/dashboard/orders/subscriptions");
      subscriptionOrders.value = response.data.content;
    });
  };

  return {
    overallSummary,
    salesMonthlySummary,
    subscriptionOrders,
    loadOverallSummary,
    loadSalesMonthlySummary,
    loadSubscriptionOrders,
  };
});
