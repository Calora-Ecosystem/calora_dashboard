import { MENU, MOMENT_TYPES } from "../constants/ApiContstants";

export type MomentType = (typeof MOMENT_TYPES)[number];
export type MenuType = (typeof MENU)[number];

export type ReminderMessageDto = {
  id: number;
  type: MomentType;
  menu: MenuType | null;
  title: string | null;
  description: string | null;
};

export type CreateOrUpdateReminderMessageDto = {
  id?: number | null;
  type: MomentType;
  menu: MenuType | null;
  title: string;
  description: string;
};
