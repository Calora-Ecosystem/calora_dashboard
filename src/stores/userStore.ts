import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type { GetAllUsersDto } from "../@types/user";
import { useApiCallStore } from "./apiCallStore";

export const useUserStore = defineStore("user", () => {
  const { execute } = useApiCallStore();

  const loadUsersPaged = async (
    skip: number,
    take: number,
  ): Promise<ApiBaseResponse<GetAllUsersDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/users", {
        params: { skip, take, sortPropName: "id" },
      });
      return response.data;
    });
  };

  return { loadUsersPaged };
});
