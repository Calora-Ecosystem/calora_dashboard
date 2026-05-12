import { defineStore } from "pinia";
import { AxiosError } from "axios";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type { EnumRole, GetAllUsersDto } from "../@types/user";
import { useApiCallStore } from "./apiCallStore";

export const useUserStore = defineStore("user", () => {
  const { execute } = useApiCallStore();

  const loadUsersPaged = async (
    skip: number,
    take: number,
    filters?: { name?: string; email?: string; phone?: string },
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
          SortPropName: "id",
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

  return { loadUsersPaged, getUserById, updateRoles };
});
