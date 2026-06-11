import { defineStore } from "pinia";
import { reactive, ref } from "vue";
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
  isPopular: boolean;
  createdAt: string;
};

export type SavePlanExtraDto = {
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
  // Obuna tariflari (Plan extras) — HOZIRCHA MOCK (fake) data.
  // Backend API tayyor bo'lgach, quyidagi metodlar ichidagi mock
  // logikani axios chaqiruvlariga almashtiring. Taxminiy endpointlar:
  //   GET    /billing/plans
  //   GET    /billing/plans/{id}
  //   POST   /billing/plans         (yaratish)
  //   PUT    /billing/plans/{id}    (tahrirlash)
  //   DELETE /billing/plans/{id}
  // ───────────────────────────────────────────────────────────────
  const mockPlans = reactive<PlanExtraDto[]>([
    { id: 1, plan: "Premium", duration: 1, fee: 39000, originalFee: 49000, isActive: true, isPopular: false, createdAt: "2026-01-10T10:00:00" },
    { id: 2, plan: "Premium", duration: 3, fee: 99000, originalFee: 129000, isActive: true, isPopular: true, createdAt: "2026-01-10T10:00:00" },
    { id: 3, plan: "Premium", duration: 6, fee: 179000, originalFee: 249000, isActive: true, isPopular: false, createdAt: "2026-01-10T10:00:00" },
    { id: 4, plan: "Premium", duration: 12, fee: 299000, originalFee: 489000, isActive: true, isPopular: false, createdAt: "2026-01-10T10:00:00" },
    { id: 5, plan: "Pro", duration: 1, fee: 59000, originalFee: 69000, isActive: true, isPopular: false, createdAt: "2026-02-01T10:00:00" },
    { id: 6, plan: "Pro", duration: 12, fee: 499000, originalFee: 799000, isActive: true, isPopular: true, createdAt: "2026-02-01T10:00:00" },
    { id: 7, plan: "Pro", duration: 3, fee: 159000, originalFee: 199000, isActive: false, isPopular: false, createdAt: "2026-02-01T10:00:00" },
  ]);
  let mockSeq = 100;

  const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

  const loadPlans = async (): Promise<PlanExtraDto[]> => {
    await delay();
    return [...mockPlans].sort(
      (a, b) => a.plan.localeCompare(b.plan) || a.duration - b.duration,
    );
  };

  const getPlanById = async (id: number): Promise<PlanExtraDto | null> => {
    await delay();
    const found = mockPlans.find((p) => p.id === id);
    return found ? { ...found } : null;
  };

  const savePlan = async (data: SavePlanExtraDto): Promise<PlanExtraDto> => {
    await delay();
    if (data.id && data.id > 0) {
      const idx = mockPlans.findIndex((p) => p.id === data.id);
      if (idx !== -1) {
        mockPlans[idx] = { ...mockPlans[idx], ...data } as PlanExtraDto;
        return { ...mockPlans[idx] };
      }
    }
    const created: PlanExtraDto = {
      ...data,
      id: ++mockSeq,
      createdAt: new Date().toISOString(),
    };
    mockPlans.push(created);
    return { ...created };
  };

  const deletePlan = async (id: number): Promise<void> => {
    await delay();
    const idx = mockPlans.findIndex((p) => p.id === id);
    if (idx !== -1) mockPlans.splice(idx, 1);
  };

  return {
    editingCoupon,
    loadCoupons,
    modifyCoupon,
    getCouponById,
    getCouponUsages,
    checkCoupon,
    loadPlans,
    getPlanById,
    savePlan,
    deletePlan,
  };
});
