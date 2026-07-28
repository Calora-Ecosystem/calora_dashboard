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

export type UserDetailExtraDto = {
  weight: number;
  entryWeight: number;
  height: number;
  bmi: number;
  gender: string;
  birthDate: string;
  age: number;
  purpose: string;
  physicalActivity: string | null;
  activityLevel: string;
  language: string;
  photo: string | null;
};

export type UserNormValueDto = {
  metric: string;
  value: number;
};

export type UserDetailDto = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
  subscription: SubscriptionDto | null;
  extra: UserDetailExtraDto | null;
  signInCount: number;
  lastSignInAt: string | null;
  norms: UserNormValueDto[];
};
