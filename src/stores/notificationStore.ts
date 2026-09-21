import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type { MenuType } from "../@types/reminder";
import type { GetNotificationDto } from "../@types/pushHistory";
import { useApiCallStore } from "./apiCallStore";

// Backend: POST /notifications/batch  (Core.Services.Notification.Contracts.BatchPushNotificationDto)
// Bitta so'rov bilan bir nechta / barcha foydalanuvchilarga push yuboradi.
// `allUsers: true` => hamma userlarga; aks holda `userIds` ro'yxatiga.
// `scheduled` (ISO date-time) => server tomonda o'sha vaqtga rejalashtiradi (null => hoziroq).
export type BatchPushNotificationDto = {
  title: string;
  description: string;
  image?: string | null;
  scheduled?: string | null;
  meta?: Record<string, string> | null;
  mealGateMenu?: MenuType | null;
  allUsers: boolean;
  userIds?: number[] | null;
};

// Bitta userga push uchun (POST /notifications).
export type PushNotificationDto = {
  userId: number;
  title: string;
  description: string;
  image?: string | null;
  scheduled?: string | null;
  meta?: Record<string, string> | null;
  mealGateMenu?: MenuType | null;
};

export const useNotificationStore = defineStore("notification", () => {
  const { execute } = useApiCallStore();

  // Barcha foydalanuvchilar sonini olish (broadcastdan oldin auditoriyani ko'rsatish uchun).
  const getUsersTotal = async (): Promise<number> => {
    return await execute(async () => {
      const response = await axios.get("/users", {
        params: { Skip: 0, Take: 1, SortPropName: "id", SortDirection: "Ascending" },
      });
      return response.data?.total ?? 0;
    });
  };

  // Broadcast / batch push. Javob `content` — yaratilgan bildirishnomalar soni.
  const sendBatch = async (
    dto: BatchPushNotificationDto,
  ): Promise<ApiBaseResponse<number>> => {
    return await execute(async () => {
      const response = await axios.post("/notifications/batch", dto);
      return response.data;
    });
  };

  // Bitta foydalanuvchiga push (kerak bo'lganda).
  const sendToUser = async (
    dto: PushNotificationDto,
  ): Promise<ApiBaseResponse> => {
    return await execute(async () => {
      const response = await axios.post("/notifications", dto);
      return response.data;
    });
  };

  // ── Server qutisi (joriy foydalanuvchi bildirishnomalari) ─────────
  // `GET /notifications` faqat chaqiruvchi (token egasi) qutisini qaytaradi
  // — global "yuborilganlar" ro'yxati emas.
  const loadNotifications = async (
    skip: number,
    take: number,
  ): Promise<ApiBaseResponse<GetNotificationDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/notifications", {
        params: {
          Skip: skip,
          Take: take,
          SortPropName: "id",
          SortDirection: "Descending",
        },
      });
      return response.data;
    });
  };

  const markAsRead = async (id: number): Promise<void> => {
    await execute(async () => {
      await axios.put(`/notifications/mark-as-read/${id}`);
    });
  };

  const markAllAsRead = async (): Promise<void> => {
    await execute(async () => {
      await axios.put("/notifications/mark-as-read/all");
    });
  };

  return {
    getUsersTotal,
    sendBatch,
    sendToUser,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
});
