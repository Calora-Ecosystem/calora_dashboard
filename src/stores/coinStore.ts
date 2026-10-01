import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type {
  AdminMarketItemDto,
  CoinPeriodQuery,
  CoinRankingRowDto,
  CoinRulePreviewDto,
  CoinRulesDto,
  CoinSummaryDto,
  CoinTransactionDto,
  CoinTxType,
  MarketPurchaseDto,
  MarketSummaryDto,
  SaveCoinRuleDto,
  SaveMarketItemDto,
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

  // ── Qadam → coin qoidasi ────────────────────────────────────────
  // Mutatsiyalar `silent` — xatoni sahifa o'zi tushunarli matn bilan ko'rsatadi.
  const getRules = async (): Promise<CoinRulesDto | null> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/coins/rules");
      return response.data?.content ?? null;
    });
  };

  const saveRule = async (dto: SaveCoinRuleDto): Promise<CoinRulesDto | null> => {
    return await execute(async () => {
      const response = await axios.post("/dashboard/coins/rules", dto, { silent: true } as any);
      return response.data?.content ?? null;
    });
  };

  const deleteRule = async (id: number): Promise<CoinRulesDto | null> => {
    return await execute(async () => {
      const response = await axios.delete(`/dashboard/coins/rules/${id}`, { silent: true } as any);
      return response.data?.content ?? null;
    });
  };

  const previewRule = async (
    stepsPerCoin: number,
    maxDailyCoins: number,
    days = 30,
  ): Promise<CoinRulePreviewDto | null> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/coins/rules/preview", {
        params: { stepsPerCoin, maxDailyCoins, days },
      });
      return response.data?.content ?? null;
    });
  };

  // ── Coin do'koni ────────────────────────────────────────────────
  const getMarketItems = async (period: CoinPeriodQuery): Promise<AdminMarketItemDto[]> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/market/items", { params: period });
      return response.data?.content ?? [];
    });
  };

  const getMarketSummary = async (period: CoinPeriodQuery): Promise<MarketSummaryDto | null> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/market/summary", { params: period });
      return response.data?.content ?? null;
    });
  };

  const saveMarketItem = async (dto: SaveMarketItemDto) => {
    return await execute(async () => {
      const response = await axios.post("/dashboard/market/items", dto, { silent: true } as any);
      return response.data?.content ?? null;
    });
  };

  const deleteMarketItem = async (id: number) => {
    return await execute(async () => {
      const response = await axios.delete(`/dashboard/market/items/${id}`, { silent: true } as any);
      return response.data;
    });
  };

  const getMarketPurchases = async (
    period: CoinPeriodQuery,
    skip: number,
    take: number,
    itemId?: number | null,
    search?: string,
  ): Promise<ApiBaseResponse<MarketPurchaseDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/market/purchases", {
        params: {
          ...period,
          itemId: itemId || undefined,
          search: search?.trim() || undefined,
          Skip: skip,
          Take: take,
        },
      });
      return response.data;
    });
  };

  return {
    getSummary,
    getRanking,
    getUserCoins,
    getUserTransactions,
    getRules,
    saveRule,
    deleteRule,
    previewRule,
    getMarketItems,
    getMarketSummary,
    saveMarketItem,
    deleteMarketItem,
    getMarketPurchases,
  };
});
