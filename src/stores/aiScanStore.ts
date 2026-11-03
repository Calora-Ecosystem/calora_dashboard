import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type {
  AdminScanSummaryDto,
  AdminScanUserDetailDto,
  AdminScanUserDto,
  ScanSort,
  ScanStatusFilter,
} from "../@types/aiScan";
import { useApiCallStore } from "./apiCallStore";

// Bepul AI skan limiti: kimda nechta skan bor, qanchasi ishlatilgan (dashboard/ai/scans/*).
export const useAiScanStore = defineStore("aiScan", () => {
  const { execute } = useApiCallStore();

  const getSummary = async (): Promise<AdminScanSummaryDto | null> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/ai/scans/summary");
      return response.data?.content ?? null;
    });
  };

  const getUsers = async (params: {
    status: ScanStatusFilter;
    sort: ScanSort;
    search?: string;
    skip: number;
    take: number;
  }): Promise<ApiBaseResponse<AdminScanUserDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/dashboard/ai/scans/users", {
        params: {
          status: params.status,
          sort: params.sort,
          search: params.search?.trim() || undefined,
          Skip: params.skip,
          Take: params.take,
        },
      });
      return response.data;
    });
  };

  const getUser = async (userId: number): Promise<AdminScanUserDetailDto | null> => {
    return await execute(async () => {
      const response = await axios.get(`/dashboard/ai/scans/users/${userId}`);
      return response.data?.content ?? null;
    });
  };

  return { getSummary, getUsers, getUser };
});
