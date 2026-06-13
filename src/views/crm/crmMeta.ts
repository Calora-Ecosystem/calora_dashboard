import type {
  LeadStatus,
  LeadTemperature,
  PaymentProvider,
  StatsPeriod,
} from "../../stores/crmStore";

export const STATUS_META: Record<
  LeadStatus,
  { label: string; color: string; soft: string; icon: string }
> = {
  New: { label: "Yangi", color: "var(--info)", soft: "var(--info-soft)", icon: "sparkles" },
  Assigned: { label: "Biriktirilgan", color: "var(--text-muted)", soft: "var(--surface-2)", icon: "user" },
  Contacted: { label: "Bog'lanilgan", color: "var(--brand-strong)", soft: "var(--brand-soft)", icon: "phone" },
  Interested: { label: "Qiziqqan", color: "var(--warning)", soft: "var(--warning-soft)", icon: "zap" },
  FollowUp: { label: "Follow Up", color: "#9333ea", soft: "rgba(147,51,234,0.12)", icon: "clock" },
  Won: { label: "Sotuv", color: "var(--success)", soft: "var(--success-soft)", icon: "check-circle" },
  Lost: { label: "Yo'qotilgan", color: "var(--danger)", soft: "var(--danger-soft)", icon: "x" },
};

// Kanban column order.
export const KANBAN_STATUSES: LeadStatus[] = [
  "New",
  "Assigned",
  "Contacted",
  "Interested",
  "FollowUp",
  "Won",
  "Lost",
];

export const TEMP_META: Record<
  LeadTemperature,
  { label: string; color: string; soft: string; icon: string }
> = {
  Cold: { label: "Sovuq", color: "#2e90fa", soft: "var(--info-soft)", icon: "snowflake" },
  Warm: { label: "Iliq", color: "var(--warning)", soft: "var(--warning-soft)", icon: "thermometer" },
  Hot: { label: "Qaynoq", color: "#f97316", soft: "rgba(249,115,22,0.12)", icon: "flame" },
  VeryHot: { label: "Juda qaynoq", color: "var(--danger)", soft: "var(--danger-soft)", icon: "flame" },
};

export const PAYMENT_META: Record<PaymentProvider, { label: string; kind: "card" | "platform" }> = {
  Click: { label: "Click (karta)", kind: "card" },
  Payme: { label: "Payme (karta)", kind: "card" },
  Iap: { label: "Platforma (IAP)", kind: "platform" },
};

export const PERIOD_LABEL: Record<StatsPeriod, string> = {
  Day: "Bugun",
  Week: "Hafta",
  Month: "Oy",
};

export const initials = (name: string | null) =>
  (name?.trim()?.[0] ?? "?").toUpperCase();

export const avatarHue = (id: number) => (id * 47) % 360;

export const relativeTime = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value).getTime();
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return "hozir";
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} kun oldin`;
  return new Date(value).toLocaleDateString("uz-UZ");
};

export const dueLabel = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Bugun ${time}`;
  return `${d.toLocaleDateString("uz-UZ")} ${time}`;
};
