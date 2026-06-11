import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type {
  CreateFoodCategoryDto,
  CreateFoodDto,
  FoodCategory,
  FoodDto,
  GetAllFoodDto,
  UpdateFoodDto,
} from "../@types/food";
import { useApiCallStore } from "./apiCallStore";

export const useFoodStore = defineStore("food", () => {
  const { execute } = useApiCallStore();

  const loadCategories = async (params?: {
    Skip?: number;
    Take?: number;
  }): Promise<FoodCategory[]> => {
    return await execute(async () => {
      const response = await axios.get("/food/categories", { params });
      return response.data.content;
    });
  };

  const searchCategories = async (query?: string): Promise<FoodCategory[]> => {
    return await execute(async () => {
      const params: Record<string, unknown> = { Skip: 0, Take: 10 };
      if (query) params.FilteringExpression = `name$$${query}`;
      const response = await axios.get("/food/categories", { params });
      return response.data.content;
    });
  };

  const saveCategory = async (data: CreateFoodCategoryDto) => {
    await execute(async () => {
      await axios.post("/food/categories", data);
    });
  };

  const getCategoryById = async (id: number): Promise<FoodCategory | null> => {
    return await execute(async () => {
      const response = await axios.get("/food/categories", {
        params: { FilteringExpression: `id==${id}` },
      });
      return (response.data.content)?.[0] ?? null;
    });
  };

  const loadCategoriesPaged = async (
    skip: number,
    take: number,
    search?: string,
  ): Promise<ApiBaseResponse<FoodCategory[]>> => {
    return await execute(async () => {
      const params: Record<string, unknown> = { Skip: skip, Take: take };
      if (search?.trim()) params.FilteringExpression = `name$$${search.trim()}`;
      const response = await axios.get("/food/categories", { params });
      return response.data;
    });
  };

  const deleteCategory = async (id: number) => {
    await execute(async () => {
      await axios.delete(`/food/categories/${id}`);
    });
  };

  const loadFoods = async (): Promise<GetAllFoodDto[]> => {
    return await execute(async () => {
      const response = await axios.get("/food");
      return response.data.content;
    });
  };

  const loadFoodsPaged = async (
    skip: number,
    take: number,
    search?: string,
  ): Promise<ApiBaseResponse<GetAllFoodDto[]>> => {
    return await execute(async () => {
      const params: Record<string, unknown> = { Skip: skip, Take: take };
      if (search?.trim()) params.FilteringExpression = `name$$${search.trim()}`;
      const response = await axios.get("/food", { params });
      return response.data;
    });
  };

  const getFoodById = async (id: number): Promise<FoodDto> => {
    return await execute(async () => {
      const response = await axios.get(`/food/${id}`);
      return response.data.content;
    });
  };

  const createFood = async (data: CreateFoodDto) => {
    await execute(async () => {
      await axios.post("/food/general", data);
    });
  };

  const updateFood = async (id: number, data: UpdateFoodDto) => {
    await execute(async () => {
      await axios.put(`/food/${id}`, data);
    });
  };

  const deleteFood = async (id: number) => {
    await execute(async () => {
      await axios.delete(`/food/${id}`);
    });
  };

  return {
    loadCategories,
    loadCategoriesPaged,
    searchCategories,
    getCategoryById,
    saveCategory,
    deleteCategory,
    loadFoods,
    loadFoodsPaged,
    getFoodById,
    createFood,
    updateFood,
    deleteFood,
  };
});
