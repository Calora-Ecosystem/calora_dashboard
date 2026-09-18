import { ACTIVITIES, GENDERS, PLANS } from "../constants/ApiContstants";

export type GenderKey = (typeof GENDERS)[number];
export type ActivityKey = (typeof ACTIVITIES)[number];
export type PlanKey = (typeof PLANS)[number];

// Foydalanuvchi appdan qanchalik faol foydalanayotgani (engagement).
//   any     — barcha
//   active  — oxirgi `activeWithinDays` kun ichida kirgan (doimiy foydalanuvchi)
//   dormant — `dormantAfterDays` kun va undan ko'proq kirmagan yoki umuman
//             kirmagan (kam faol / uxlab qolgan — re-engagement uchun)
export type EngagementMode = "any" | "active" | "dormant";

// Auditoriya segmentini aniqlaydigan filtr. Bo'sh massiv / null => "har qanday".
export type SegmentFilter = {
  genders: GenderKey[];
  ageMin: number | null;
  ageMax: number | null;
  activityLevels: ActivityKey[];
  plans: PlanKey[];
  engagement: EngagementMode;
  activeWithinDays: number;
  dormantAfterDays: number;
};

// `/dashboard/users/{id}/detail` dan yig'ilgan, segmentlash uchun kerakli
// maydonlar bilan boyitilgan yengil foydalanuvchi yozuvi.
export type AudienceUser = {
  id: number;
  name: string | null;
  gender: GenderKey | null;
  age: number | null;
  activityLevel: ActivityKey | null;
  purpose: string | null;
  plan: PlanKey;
  isPremium: boolean;
  signInCount: number;
  lastSignInAt: string | null;
  // Oxirgi kirishdan beri o'tgan kunlar. null => umuman kirmagan.
  daysSinceLastSignIn: number | null;
  createdAt: string | null;
  // extra (profil) to'ldirilganmi — jins/yosh/faollik mavjudmi.
  hasProfile: boolean;
};

// Qayta ishlatiladigan nomlangan segment ("push listi"). Backend endpointi
// bo'lmagani uchun lokal (persisted) saqlanadi.
export type SavedSegment = {
  id: string;
  name: string;
  filter: SegmentFilter;
  createdAt: string;
};

export const emptySegmentFilter = (): SegmentFilter => ({
  genders: [],
  ageMin: null,
  ageMax: null,
  activityLevels: [],
  plans: [],
  engagement: "any",
  activeWithinDays: 7,
  dormantAfterDays: 14,
});
