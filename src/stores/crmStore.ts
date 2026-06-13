import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import { useApiCallStore } from "./apiCallStore";
import type {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  LEAD_TEMPERATURES,
  STATS_PERIODS,
} from "../constants/ApiContstants";

export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];
export type StatsPeriod = (typeof STATS_PERIODS)[number];
export type PaymentProvider = "Click" | "Payme" | "Iap";

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
  operatorId: number | null;
  operatorName: string | null;
  status: LeadStatus;
  score: number;
  temperature: LeadTemperature;
  lastActivity: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  followUpOverdue: boolean;
  createdAt: string;
};

export type LeadDetailDto = LeadDto & {
  paymentProvider: PaymentProvider | null;
  wonAmount: number | null;
  wonAt: string | null;
  promoCode: string | null;
  age: number | null;
  gender: string | null;
  weight: number | null;
  height: number | null;
  purpose: string | null;
};

export type NoteDto = {
  id: number;
  text: string | null;
  operatorName: string | null;
  createdAt: string;
};

export type UpsertNoteDto = { id?: number | null; text: string };

export type LeadActivityDto = {
  id: number;
  type: string;
  description: string;
  actorName: string | null;
  createdAt: string;
};

export type FollowUpDto = {
  id: number;
  leadId: number;
  leadName: string | null;
  leadPhone: string | null;
  dueAt: string;
  note: string | null;
  isDone: boolean;
  overdue: boolean;
};

export type OperatorDashboardDto = {
  myLeads: number;
  activeLeads: number;
  hotLeads: number;
  todayCalls: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  todaySales: number;
  todayRevenue: number;
  conversionRate: number;
};

export type OperatorStatsDto = {
  period: StatsPeriod;
  leadsWorked: number;
  calls: number;
  sales: number;
  revenue: number;
  conversionRate: number;
  cardSales: number;
  platformSales: number;
  promoSales: number;
};

export type LoadLeadsParams = {
  skip: number;
  take: number;
  priority?: LeadPriority;
  status?: LeadStatus;
  temperature?: LeadTemperature;
  minScore?: number;
  maxScore?: number;
  operatorId?: number;
  unassigned?: boolean;
  purchased?: boolean;
  search?: string;
  filteringExpression?: string[];
  sortPropName?: string;
  sortDirection?: "Ascending" | "Descending";
};

export const useCrmStore = defineStore("crm", () => {
  const { execute } = useApiCallStore();

  const loadLeads = async (
    params: LoadLeadsParams,
  ): Promise<ApiBaseResponse<LeadDto[]>> =>
    execute(async () => {
      const response = await axios.get("/crm/leads", {
        params: {
          Skip: params.skip,
          Take: params.take,
          Priority: params.priority,
          Status: params.status,
          Temperature: params.temperature,
          MinScore: params.minScore,
          MaxScore: params.maxScore,
          OperatorId: params.operatorId,
          Unassigned: params.unassigned,
          Purchased: params.purchased,
          Search: params.search,
          FilteringExpression: params.filteringExpression,
          SortPropName: params.sortPropName,
          SortDirection: params.sortDirection,
        },
      });
      return response.data;
    });

  const getLeadById = async (
    id: number,
  ): Promise<ApiBaseResponse<LeadDetailDto>> =>
    execute(async () => (await axios.get(`/crm/leads/${id}`)).data);

  const getLeadTimeline = async (
    id: number,
  ): Promise<ApiBaseResponse<LeadActivityDto[]>> =>
    execute(async () => (await axios.get(`/crm/leads/${id}/timeline`)).data);

  const moveStatus = async (
    id: number,
    status: LeadStatus,
    reason?: string,
  ): Promise<ApiBaseResponse> =>
    execute(
      async () =>
        (await axios.patch(`/crm/leads/${id}/status`, { status, reason })).data,
    );

  const contactLead = async (id: number): Promise<ApiBaseResponse> =>
    execute(async () => (await axios.post(`/crm/leads/${id}/contact`)).data);

  const getLeadNotes = async (
    leadId: number,
  ): Promise<ApiBaseResponse<NoteDto[]>> =>
    execute(async () => (await axios.get(`/crm/leads/${leadId}/notes`)).data);

  const upsertLeadNote = async (
    leadId: number,
    data: UpsertNoteDto,
  ): Promise<ApiBaseResponse<number>> =>
    execute(
      async () => (await axios.post(`/crm/leads/${leadId}/notes`, data)).data,
    );

  const deleteNote = async (noteId: number): Promise<ApiBaseResponse> =>
    execute(async () => (await axios.delete(`/crm/notes/${noteId}`)).data);

  const createFollowUp = async (
    leadId: number,
    dueAt: string,
    note?: string,
  ): Promise<ApiBaseResponse<number>> =>
    execute(
      async () =>
        (await axios.post(`/crm/leads/${leadId}/followups`, { dueAt, note }))
          .data,
    );

  const completeFollowUp = async (
    followUpId: number,
  ): Promise<ApiBaseResponse> =>
    execute(
      async () =>
        (await axios.patch(`/crm/followups/${followUpId}/complete`)).data,
    );

  const getFollowUps = async (
    scope?: "today" | "overdue" | "upcoming",
  ): Promise<ApiBaseResponse<FollowUpDto[]>> =>
    execute(
      async () =>
        (await axios.get(`/crm/followups`, { params: { scope } })).data,
    );

  const getMe = async (): Promise<
    ApiBaseResponse<{ id: number; name: string; roles: string[] }>
  > => execute(async () => (await axios.get(`/crm/me`)).data);

  const getMyDashboard = async (): Promise<
    ApiBaseResponse<OperatorDashboardDto>
  > => execute(async () => (await axios.get(`/crm/me/dashboard`)).data);

  const getMyStats = async (
    period: StatsPeriod,
  ): Promise<ApiBaseResponse<OperatorStatsDto>> =>
    execute(
      async () =>
        (await axios.get(`/crm/me/stats`, { params: { period } })).data,
    );

  return {
    loadLeads,
    getLeadById,
    getLeadTimeline,
    moveStatus,
    contactLead,
    getLeadNotes,
    upsertLeadNote,
    deleteNote,
    createFollowUp,
    completeFollowUp,
    getFollowUps,
    getMe,
    getMyDashboard,
    getMyStats,
  };
});
