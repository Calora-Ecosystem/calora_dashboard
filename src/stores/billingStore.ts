import { defineStore } from "pinia";
import { ref } from "vue";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import { useApiCallStore } from "./apiCallStore";

export type CouponDto = {
  id: number;
  code: string;
  usages: number;
  amount: number;
  isActive: boolean;
  oneTime: boolean;
  expireAt: string | null;
  allowedUserIds: number[] | null;
  createdAt: string;
  updatedAt: string;
};

export type CouponUsageDto = {
  orderId: number;
  userName: string;
  createdAt: string;
  amount: number;
};

export type CreateCouponDto = {
  id?: number;
  code: string;
  amount: number;
  isActive: boolean;
  oneTime: boolean;
  expireAt: string | null;
  allowedUserIds: number[] | null;
};

export type CheckCouponDto = {
  id: number;
  amount: number;
  isActive: boolean;
  expireAt: string | null;
};

export const useBillingStore = defineStore("billing", () => {
  const { execute } = useApiCallStore();

  const editingCoupon = ref<CouponDto | null>(null);

  const loadCoupons = async (skip: number, take: number): Promise<ApiBaseResponse<CouponDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/billing/coupons", { params: { Skip: skip, Take: take } });
      return response.data;
    });
  };

  const modifyCoupon = async (data: CreateCouponDto): Promise<ApiBaseResponse> => {
    return await execute(async () => {
      const response = await axios.post("/billing/coupons", data);
      return response.data;
    });
  };

  const getCouponUsages = async (couponId: number, skip: number, take: number): Promise<ApiBaseResponse<CouponUsageDto[]>> => {
    return await execute(async () => {
      const response = await axios.get(`/billing/coupons/${couponId}/usages`, {
        params: { Skip: skip, Take: take },
      });
      return response.data;
    });
  };

  const getCouponById = async (id: number): Promise<ApiBaseResponse<CouponDto>> => {
    return await execute(async () => {
      const response = await axios.get(`/billing/coupons/${id}`);
      return response.data;
    });
  };

  const checkCoupon = async (code: string): Promise<ApiBaseResponse<CheckCouponDto>> => {
    return await execute(async () => {
      const response = await axios.get("/billing/coupons/check", { params: { code } });
      return response.data;
    });
  };

  return { editingCoupon, loadCoupons, modifyCoupon, getCouponById, getCouponUsages, checkCoupon };
});
