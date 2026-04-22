import { MENU, METRICS } from "../constants/ApiContstants";
import type { Mlf } from "./common";

export type EnumMetrics = (typeof METRICS)[number];
export type EnumMenu = (typeof MENU)[number];

export interface FoodMetricDto {
  metric: EnumMetrics;
  value: number;
}

export interface FoodCategory {
  id: number;
  name: Mlf;
  coverUrl: string | null;
}

export interface CreateFoodCategoryDto {
  id?: number | null;
  name: Mlf;
  coverUrl?: string | null;
}

export interface GetAllFoodDto {
  id: number;
  name: Mlf;
  categoryId: number;
  categoryName: Mlf;
  coverUrl: string | null;
  metrics: FoodMetricDto[] | null;
  isUserFood: boolean;
  isFavourite: boolean;
}

export interface FoodDto {
  id: number;
  name: Mlf;
  categoryId: number;
  description: string | null;
  categoryName: Mlf;
  coverUrl: string | null;
  metrics: FoodMetricDto[] | null;
  isUserFood: boolean;
  userId: number | null;
}

export interface CreateFoodDto {
  id?: number | null;
  categoryId: number | null;
  name: Mlf;
  coverUrl: string | null;
  description: string | null;
  metrics: FoodMetricDto[];
}

export interface UpdateFoodDto extends CreateFoodDto {
  userId?: number | null;
}
