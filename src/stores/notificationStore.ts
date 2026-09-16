import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type { GetAllUsersDto } from "../@types/user";
import type { MenuType } from "../@types/reminder";
import { useApiCallStore } from "./apiCallStore";
import { useTokenStore } from "./tokenStore";

// Backend: POST /notifications  (Core.Services.Notification.Contracts.PushNotificationDto)
// Har bir so'rov faqat bitta mavjud foydalanuvchiga push yuboradi. Backendda
// "barcha userlarga" degan yagona endpoint yo'q, shuning uchun broadcast
// frontendda barcha user id'lar bo'ylab aylanish orqali amalga oshiriladi.
export type PushNotificationDto = {
  userId: number;
  title: string;
  description: string;
  image?: string | null;
  // ISO date-time (masalan "2026-09-16T18:30:00"). null => hoziroq yuboriladi.
  scheduled?: string | null;
  meta?: Record<string, string> | null;
  mealGateMenu?: MenuType | null;
};

export type BroadcastPayload = Omit<PushNotificationDto, "userId">;

export type BroadcastProgress = {
  total: number;
  sent: number;
  failed: number;
  done: boolean;
};

export const useNotificationStore = defineStore("notification", () => {
  const { execute } = useApiCallStore();
  const tokenStore = useTokenStore();

  // Bitta foydalanuvchiga push yuborish.
  const sendToUser = async (
    dto: PushNotificationDto,
  ): Promise<ApiBaseResponse> => {
    return await execute(async () => {
      const response = await axios.post("/notifications", dto);
      return response.data;
    });
  };

  // Barcha foydalanuvchilar sonini olish (broadcastdan oldin auditoriyani ko'rsatish uchun).
  const getUsersTotal = async (): Promise<number> => {
    return await execute(async () => {
      const response = await axios.get("/users", {
        params: { Skip: 0, Take: 1, SortPropName: "id", SortDirection: "Ascending" },
      });
      return response.data?.total ?? 0;
    });
  };

  // Barcha foydalanuvchi id'larini sahifalab yig'ib olish.
  const loadAllUserIds = async (): Promise<number[]> => {
    return await execute(async () => {
      const take = 200;
      let skip = 0;
      const ids: number[] = [];
      // Xavfsizlik uchun cheksiz sikldan himoya.
      for (let guard = 0; guard < 1000; guard++) {
        const response = await axios.get("/users", {
          params: { Skip: skip, Take: take, SortPropName: "id", SortDirection: "Ascending" },
        });
        const content: GetAllUsersDto[] = response.data?.content ?? [];
        for (const u of content) if (typeof u.id === "number") ids.push(u.id);
        const total: number = response.data?.total ?? ids.length;
        skip += take;
        if (content.length === 0 || ids.length >= total) break;
      }
      return ids;
    });
  };

  // Bir xil push'ni ko'rsatilgan foydalanuvchilarga cheklangan parallellik bilan yuborish.
  // HandlerChain'ni chetlab o'tamiz: har bir xatolik uchun global bildirishnoma
  // chiqmasligi va global loading indikatori miltillamasligi uchun to'g'ridan-to'g'ri axios.
  const broadcast = async (
    payload: BroadcastPayload,
    userIds: number[],
    onProgress?: (p: BroadcastProgress) => void,
    concurrency = 8,
  ): Promise<BroadcastProgress> => {
    const headers = tokenStore.accessToken
      ? { Authorization: `Bearer ${tokenStore.accessToken}` }
      : {};
    const total = userIds.length;
    let sent = 0;
    let failed = 0;
    const queue = [...userIds];

    const emit = () => onProgress?.({ total, sent, failed, done: false });

    const worker = async () => {
      while (queue.length) {
        const userId = queue.shift()!;
        try {
          await axios.post(
            "/notifications",
            { ...payload, userId },
            { headers, silent: true } as any,
          );
          sent++;
        } catch {
          failed++;
        }
        emit();
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, total) || 1 },
      () => worker(),
    );
    await Promise.all(workers);

    const final: BroadcastProgress = { total, sent, failed, done: true };
    onProgress?.(final);
    return final;
  };

  return {
    sendToUser,
    getUsersTotal,
    loadAllUserIds,
    broadcast,
  };
});
