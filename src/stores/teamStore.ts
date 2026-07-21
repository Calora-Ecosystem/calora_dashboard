import { defineStore } from "pinia";
import { axios } from "../integrations/axios";
import type { ApiBaseResponse } from "../@types/common";
import { useApiCallStore } from "./apiCallStore";

/** Jamoa a'zosiga beriladigan rollar (oddiy "User" bu yerda ishlatilmaydi). */
export const TEAM_ROLES = ["SuperAdmin", "HeadOfSales", "Operator"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export type TeamMemberDto = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  activeLeads: number;
  createdAt: string;
};

export type CreateTeamMemberDto = {
  name: string;
  email: string;
  phone?: string;
  roles: TeamRole[];
};

export type UpdateTeamMemberDto = {
  name: string;
  phone?: string;
  roles: TeamRole[];
};

export const useTeamStore = defineStore("team", () => {
  const { execute } = useApiCallStore();

  const getMembers = async (): Promise<ApiBaseResponse<TeamMemberDto[]>> =>
    await execute(async () => {
      const response = await axios.get("/team");
      return response.data;
    });

  const createMember = async (dto: CreateTeamMemberDto): Promise<number> =>
    await execute(async () => {
      const response = await axios.post("/team", dto);
      return response.data?.content;
    });

  const updateMember = async (
    memberId: number,
    dto: UpdateTeamMemberDto,
  ): Promise<void> => {
    await execute(async () => {
      await axios.put(`/team/${memberId}`, dto);
    });
  };

  const deleteMember = async (memberId: number): Promise<void> => {
    await execute(async () => {
      await axios.delete(`/team/${memberId}`);
    });
  };

  return { getMembers, createMember, updateMember, deleteMember };
});
