import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type {
  CoinPeriodQuery,
  CoinRankingRowDto,
  CoinSummaryDto,
  CoinTransactionDto,
  CoinTxType,
  UserCoinsDto,
} from "../@types/coin";
import { useApiCallStore } from "./apiCallStore";

// Coin reytingi va userlarning kunma-kun coinlari (g'oliblarni aniqlash uchun).
// Davr (from/to) — "YYYY-MM-DD" kunlar, ikkalasi ham kiradi; berilmasa butun vaqt.
export const useCoinStore = defineStore("coin", () => {
  const { execute } = useApiCallStore();

  const getSummary = async (period: CoinPeriodQuery): Promise<CoinSummaryDto | null> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/coins/summary", { params: period });
      return response.data?.content ?? null;
    });
  };

  const getRanking = async (
    period: CoinPeriodQuery,
    skip: number,
    take: number,
    search?: string,
  ): Promise<ApiBaseResponse<CoinRankingRowDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/coins/ranking", {
        params: {
          ...period,
          search: search?.trim() || undefined,
          Skip: skip,
          Take: take,
        },
      });
      return response.data;
    });
  };

  const getUserCoins = async (
    userId: number,
    period: CoinPeriodQuery,
  ): Promise<UserCoinsDto | null> => {
    return await execute(async () => {
      const response = await axios.get(`/dashboard/coins/users/${userId}`, { params: period });
      return response.data?.content ?? null;
    });
  };

  const getUserTransactions = async (
    userId: number,
    skip: number,
    take: number,
    type?: CoinTxType | "",
  ): Promise<ApiBaseResponse<CoinTransactionDto[]>> => {
    return await execute(async () => {
      const response = await axios.get(`/dashboard/coins/users/${userId}/transactions`, {
        params: { Skip: skip, Take: take, type: type || undefined },
      });
      return response.data;
    });
  };

  return { getSummary, getRanking, getUserCoins, getUserTransactions };
});
