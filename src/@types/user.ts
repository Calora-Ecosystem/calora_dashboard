import { PLANS, ROLES } from "../constants/ApiContstants";

export type EnumSPlans = (typeof PLANS)[number];
export type EnumRole = (typeof ROLES)[number];

export type SubscriptionDto = {
  id: number;
  startsAt: string;
  endsAt: string;
  plan: EnumSPlans;
  isActive: boolean;
};

export type UserExtraShortDto = {
  photo: string | null;
};

export type GetAllUsersDto = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  roles: string[] | null;
  subscription: SubscriptionDto | null;
  extra: UserExtraShortDto | null;
  createdAt: string;
  updatedAt: string;
};
