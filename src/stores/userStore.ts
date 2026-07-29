import { defineStore } from "pinia";
import { AxiosError } from "axios";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type {
  EnumRole,
  EnumSPlans,
  GetAllUsersDto,
  SubscriptionDto,
  UserDetailDto,
} from "../@types/user";
import { useApiCallStore } from "./apiCallStore";

export type UpsertSubscriptionDto = {
  userId: number;
  plan: EnumSPlans;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export const useUserStore = defineStore("user", () => {
  const { execute } = useApiCallStore();

  const loadUsersPaged = async (
    skip: number,
    take: number,
    filters?: {
      name?: string;
      email?: string;
      phone?: string;
      sortPropName?: string;
      sortDirection?: "Ascending" | "Descending";
    },
  ): Promise<ApiBaseResponse<GetAllUsersDto[]>> => {
    return await execute(async () => {
      const FilteringExpression: string[] = [];
      if (filters?.name?.trim())
        FilteringExpression.push(`name$$${filters.name.trim()}`);
      if (filters?.email?.trim())
        FilteringExpression.push(`email$$${filters.email.trim()}`);
      if (filters?.phone?.trim())
        FilteringExpression.push(`phone$$${filters.phone.trim()}`);

      const response = await axios.get("/users", {
        params: {
          Skip: skip,
          Take: take,
          SortPropName: filters?.sortPropName || "id",
          SortDirection: filters?.sortDirection || "Descending",
          ...(FilteringExpression.length
            ? FilteringExpression.reduce(
                (acc, x) => ({
                  ...acc,
                  [`FilteringExpression`]: x,
                }),
                {},
              )
            : {}),
        },
        paramsSerializer: { indexes: null },
      });
      return response.data;
    });
  };

  const getUserById = async (
    userId: number,
  ): Promise<ApiBaseResponse<GetAllUsersDto>> => {
    return await execute(async () => {
      const response = await axios.get(`/users/${userId}`);
      return response.data;
    });
  };

  // Backend returns HTTP 500 with a .NET serialization error wrapper even on success,
  // so we swallow that specific case and confirm via a follow-up GET.
  const updateRoles = async (
    userId: number,
    roles: EnumRole[],
  ): Promise<GetAllUsersDto | null> => {
    return await execute(async () => {
      try {
        await axios.post(`/users/${userId}/update-role`, roles);
      } catch (e) {
        const err = e as AxiosError<{ error?: string }>;
        const serverError = err.response?.data?.error ?? "";
        const isKnownSerializationBug =
          err.response?.status === 500 &&
          serverError.includes("ExecutionContext");
        if (!isKnownSerializationBug) throw e;
      }
      const fresh = await axios.get(`/users/${userId}`);
      return fresh.data?.content ?? null;
    });
  };

  const getUserDetail = async (
    userId: number,
  ): Promise<UserDetailDto | null> => {
    return await execute(async () => {
      const response = await axios.get(`/dashboard/users/${userId}/detail`);
      return response.data?.content ?? null;
    });
  };

  // ── Subscriptions (admin-managed) ───────────────────────────────
  // Obunani to'lov oqimisiz to'g'ridan-to'g'ri admin tomonidan
  // yaratish/tahrirlash. Bitta foydalanuvchiga bitta obuna (upsert).
  const upsertSubscription = async (
    dto: UpsertSubscriptionDto,
  ): Promise<SubscriptionDto | null> => {
    return await execute(async () => {
      const response = await axios.post("/dashboard/subscriptions", dto);
      return response.data?.content ?? null;
    });
  };

  const deleteSubscription = async (userId: number): Promise<void> => {
    await execute(async () => {
      await axios.delete(`/dashboard/subscriptions/${userId}`);
    });
  };

  return {
    loadUsersPaged,
    getUserById,
    getUserDetail,
    updateRoles,
    upsertSubscription,
    deleteSubscription,
  };
});
