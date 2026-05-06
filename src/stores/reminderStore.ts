import { defineStore } from "pinia";
import { ref } from "vue";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import type {
  CreateOrUpdateReminderMessageDto,
  ReminderMessageDto,
} from "../@types/reminder";
import { useApiCallStore } from "./apiCallStore";

export const useReminderStore = defineStore("reminder", () => {
  const { execute } = useApiCallStore();

  const editingMessage = ref<ReminderMessageDto | null>(null);

  const loadMessages = async (
    skip: number,
    take: number
  ): Promise<ApiBaseResponse<ReminderMessageDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/reminder/messages", {
        params: { Skip: skip, Take: take },
      });
      return response.data;
    });
  };

  const getMessageById = async (
    id: number
  ): Promise<ApiBaseResponse<ReminderMessageDto>> => {
    return await execute(async () => {
      const response = await axios.get(`/reminder/messages/${id}`);
      return response.data;
    });
  };

  const modifyMessage = async (
    data: CreateOrUpdateReminderMessageDto
  ): Promise<ApiBaseResponse> => {
    return await execute(async () => {
      const response = await axios.post("/reminder/messages", data);
      return response.data;
    });
  };

  const deleteMessage = async (id: number): Promise<ApiBaseResponse> => {
    return await execute(async () => {
      const response = await axios.delete(`/reminder/messages/${id}`);
      return response.data;
    });
  };

  return {
    editingMessage,
    loadMessages,
    getMessageById,
    modifyMessage,
    deleteMessage,
  };
});
