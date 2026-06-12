import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import { useApiCallStore } from "./apiCallStore";
import type { LeadStatus, OperatorStatsDto, StatsPeriod } from "./crmStore";

export type SalesOverviewDto = {
  totalLeads: number;
  todayLeads: number;
  activeLeads: number;
  hotLeads: number;
  todayCalls: number;
  todaySales: number;
  todayRevenue: number;
  conversionRate: number;
  operatorsCount: number;
};

export type FunnelStageDto = {
  status: LeadStatus;
  count: number;
  conversionFromPrevious: number;
};

export type OperatorLeaderboardRowDto = {
  operatorId: number;
  operatorName: string;
  leads: number;
  calls: number;
  sales: number;
  revenue: number;
  conversionRate: number;
};

export type RevenuePointDto = {
  label: string;
  date: string;
  revenue: number;
  sales: number;
};

export const useSalesStore = defineStore("sales", () => {
  const { execute } = useApiCallStore();

  const getOverview = async (): Promise<ApiBaseResponse<SalesOverviewDto>> =>
    execute(async () => (await axios.get(`/crm/analytics/overview`)).data);

  const getFunnel = async (): Promise<ApiBaseResponse<FunnelStageDto[]>> =>
    execute(async () => (await axios.get(`/crm/analytics/funnel`)).data);

  const getLeaderboard = async (
    period: StatsPeriod,
  ): Promise<ApiBaseResponse<OperatorLeaderboardRowDto[]>> =>
    execute(
      async () =>
        (await axios.get(`/crm/analytics/leaderboard`, { params: { period } }))
          .data,
    );

  const getRevenue = async (
    period: StatsPeriod,
  ): Promise<ApiBaseResponse<RevenuePointDto[]>> =>
    execute(
      async () =>
        (await axios.get(`/crm/analytics/revenue`, { params: { period } })).data,
    );

  const getOperators = async (): Promise<
    ApiBaseResponse<OperatorLeaderboardRowDto[]>
  > => execute(async () => (await axios.get(`/crm/operators`)).data);

  const getOperatorStats = async (
    operatorId: number,
    period: StatsPeriod,
  ): Promise<ApiBaseResponse<OperatorStatsDto>> =>
    execute(
      async () =>
        (
          await axios.get(`/crm/operators/${operatorId}/stats`, {
            params: { period },
          })
        ).data,
    );

  return {
    getOverview,
    getFunnel,
    getLeaderboard,
    getRevenue,
    getOperators,
    getOperatorStats,
  };
});
