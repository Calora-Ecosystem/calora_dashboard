import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type {
  ReferralPeriodQuery,
  ReferralRowDto,
  ReferralStatus,
  ReferralSummaryDto,
  ReferrerDetailDto,
  ReferrerRowDto,
  ReferrerSort,
} from "../@types/referral";
import { useApiCallStore } from "./apiCallStore";

// "Do'stni taklif qilish" analitikasi (dashboard/referrals/*).
// Davr (from/to) — "YYYY-MM-DD" kunlar, ikkalasi ham kiradi; berilmasa butun vaqt.
export const useReferralStore = defineStore("referral", () => {
  const { execute } = useApiCallStore();

  const getSummary = async (period: ReferralPeriodQuery): Promise<ReferralSummaryDto | null> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/referrals/summary", { params: period });
      return response.data?.content ?? null;
    });
  };

  const getReferrers = async (
    period: ReferralPeriodQuery,
    skip: number,
    take: number,
    sort: ReferrerSort,
    search?: string,
  ): Promise<ApiBaseResponse<ReferrerRowDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/referrals/referrers", {
        params: { ...period, sort, search: search?.trim() || undefined, Skip: skip, Take: take },
      });
      return response.data;
    });
  };

  const getReferrer = async (userId: number): Promise<ReferrerDetailDto | null> => {
    return await execute(async () => {
      const response = await axios.get(`/dashboard/referrals/referrers/${userId}`);
      return response.data?.content ?? null;
    });
  };

  const getReferrals = async (params: {
    period?: ReferralPeriodQuery;
    skip: number;
    take: number;
    status?: ReferralStatus | "";
    referrerId?: number;
    search?: string;
  }): Promise<ApiBaseResponse<ReferralRowDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/referrals", {
        params: {
          ...(params.period ?? {}),
          status: params.status || undefined,
          referrerId: params.referrerId || undefined,
          search: params.search?.trim() || undefined,
          Skip: params.skip,
          Take: params.take,
        },
      });
      return response.data;
    });
  };

  return { getSummary, getReferrers, getReferrer, getReferrals };
});
