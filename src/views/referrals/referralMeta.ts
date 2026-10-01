import type { ReferralStatus, ReferrerSort } from "../../@types/referral";

export const STATUS_META: Record<ReferralStatus, { label: string; cls: string; hint: string }> = {
  Joined: { label: "Kod kiritdi", cls: "st-joined", hint: "Ro'yxatdan o'tib kodni kiritdi, lekin onboarding'ni hali tugatmagan" },
  Active: { label: "Faol", cls: "st-active", hint: "Ilovaga to'liq kirdi — taklif qiluvchining premium hisobiga qo'shildi" },
  Paid: { label: "To'lov qildi", cls: "st-paid", hint: "Kod kiritgandan keyin Premium sotib oldi" },
};

export const STATUS_FILTERS: { value: ReferralStatus | ""; label: string }[] = [
  { value: "", label: "Hammasi" },
  { value: "Joined", label: "Kod kiritdi" },
  { value: "Active", label: "Faol" },
  { value: "Paid", label: "To'lov qildi" },
];

export const SORTS: { value: ReferrerSort; label: string }[] = [
  { value: "invited", label: "Ko'p taklif" },
  { value: "activated", label: "Ko'p faol" },
  { value: "paid", label: "Ko'p to'lov" },
  { value: "revenue", label: "Tushum" },
  { value: "recent", label: "Yaqinda" },
];

/** Soat → "3 soat" / "2,5 kun". */
export const formatDuration = (hours: number | null | undefined) => {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} daq`;
  if (hours < 48) return `${Math.round(hours)} soat`;
  return `${(hours / 24).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} kun`;
};
