import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import { useApiCallStore } from "./apiCallStore";
import type { LEAD_PRIORITIES } from "../constants/ApiContstants";

export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export type LeadDto = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  isRegistered: boolean;
  subscriptionOpenedCount: number;
  purchased: boolean;
  priority: LeadPriority;
  lastActivity: string;
};

export type LeadDetailDto = LeadDto;

export type NoteDto = {
  id: number;
  text: string | null;
  operatorName: string | null;
  createdAt: string;
};

export type UpsertNoteDto = {
  id?: number | null;
  text: string;
};

export type LoadLeadsParams = {
  skip: number;
  take: number;
  priority?: LeadPriority;
  filteringExpression?: string[];
  sortPropName?: string;
  sortDirection?: "Ascending" | "Descending";
};

export const useCrmStore = defineStore("crm", () => {
  const { execute } = useApiCallStore();

  const loadLeads = async (
    params: LoadLeadsParams,
  ): Promise<ApiBaseResponse<LeadDto[]>> => {
    return await execute(async () => {
      const response = await axios.get("/crm/leads", {
        params: {
          Skip: params.skip,
          Take: params.take,
          Priority: params.priority,
          FilteringExpression: params.filteringExpression,
          SortPropName: params.sortPropName,
          SortDirection: params.sortDirection,
        },
      });
      return response.data;
    });
  };

  const getLeadById = async (
    id: number,
  ): Promise<ApiBaseResponse<LeadDetailDto>> => {
    return await execute(async () => {
      const response = await axios.get(`/crm/leads/${id}`);
      return response.data;
    });
  };

  const getLeadNotes = async (
    leadId: number,
  ): Promise<ApiBaseResponse<NoteDto[]>> => {
    return await execute(async () => {
      const response = await axios.get(`/crm/leads/${leadId}/notes`);
      return response.data;
    });
  };

  const upsertLeadNote = async (
    leadId: number,
    data: UpsertNoteDto,
  ): Promise<ApiBaseResponse<NoteDto>> => {
    return await execute(async () => {
      const response = await axios.post(`/crm/leads/${leadId}/notes`, data);
      return response.data;
    });
  };

  const deleteNote = async (noteId: number): Promise<ApiBaseResponse> => {
    return await execute(async () => {
      const response = await axios.delete(`/crm/notes/${noteId}`);
      return response.data;
    });
  };

  return {
    loadLeads,
    getLeadById,
    getLeadNotes,
    upsertLeadNote,
    deleteNote,
  };
});
