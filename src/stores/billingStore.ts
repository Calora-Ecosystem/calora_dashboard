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

export type SubscriptionPlan = "Free" | "Premium" | "Pro";

// Obuna tarifi paketi (backenddagi PlanExtra)
export type PlanExtraDto = {
  id: number;
  plan: SubscriptionPlan;
  duration: number; // oylar soni
  fee: number; // joriy narx (UZS)
  originalFee: number; // chegirmadan oldingi narx (UZS)
  isActive: boolean;
  isPopular: boolean; // "Eng yaxshi taklif" — admin tomonidan belgilanadi
  createdAt: string;
};

// Tarif yaratish/tahrirlash uchun payload. Narxlar so'mda yuboriladi.
export type CreateOrUpdatePlanExtraDto = {
  id?: number;
  plan: SubscriptionPlan;
  duration: number;
  fee: number;
  originalFee: number;
  isActive: boolean;
  isPopular: boolean;
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

  // ───────────────────────────────────────────────────────────────
  // Obuna tariflari (Plan extras) — admin CRUD.
  // GET/POST/DELETE /billing/plans — SuperAdmin, faol bo'lmaganlarni ham
  // qaytaradi. fee/originalFee API'da so'mda (backend tiyinga o'giradi).
  // GET /billing/orders/subscription/plans/{plan} — ilova (User) uchun,
  // faqat faol tariflar. Dashboard uni ishlatmaydi.
  // ───────────────────────────────────────────────────────────────

  const getPlanExtras = async (
    plan: SubscriptionPlan,
  ): Promise<PlanExtraDto[]> => {
    return await execute(async () => {
      const response = await axios.get(
        `/billing/orders/subscription/plans/${plan}`,
        { params: { Skip: 0, Take: 50 } },
      );
      return (response.data.content ?? []) as PlanExtraDto[];
    });
  };

  const loadPlans = async (): Promise<PlanExtraDto[]> => {
    return await execute(async () => {
      const response = await axios.get("/billing/plans", {
        params: { Skip: 0, Take: 200 },
      });
      return (response.data.content ?? []) as PlanExtraDto[];
    });
  };

  const modifyPlan = async (
    data: CreateOrUpdatePlanExtraDto,
  ): Promise<ApiBaseResponse<PlanExtraDto>> => {
    return await execute(async () => {
      const response = await axios.post("/billing/plans", data);
      return response.data;
    });
  };

  const deletePlan = async (id: number): Promise<ApiBaseResponse> => {
    return await execute(async () => {
      const response = await axios.delete(`/billing/plans/${id}`);
      return response.data;
    });
  };

  return {
    editingCoupon,
    loadCoupons,
    modifyCoupon,
    getCouponById,
    getCouponUsages,
    checkCoupon,
    getPlanExtras,
    loadPlans,
    modifyPlan,
    deletePlan,
  };
});
