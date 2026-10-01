import type { LocationQuery } from "vue-router";
import type { CoinPeriodQuery, CoinTxType } from "../../@types/coin";

// ── Davr (reyting va user sahifasi uchun umumiy) ────────────────────
export type PeriodKey = "all" | "today" | "week" | "lastWeek" | "month" | "lastMonth" | "custom";
export type PeriodState = { key: PeriodKey; from?: string; to?: string };

export const PERIOD_PRESETS: { key: Exclude<PeriodKey, "custom">; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "today", label: "Bugun" },
  { key: "week", label: "Shu hafta" },
  { key: "lastWeek", label: "O'tgan hafta" },
  { key: "month", label: "Shu oy" },
  { key: "lastMonth", label: "O'tgan oy" },
];

export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, days: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

// Hafta dushanbadan boshlanadi.
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** Davr → API parametrlari (from/to — kunlar, ikkalasi ham kiradi). */
export const resolvePeriod = (p: PeriodState): CoinPeriodQuery => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const range = (from: Date, to: Date) => ({ from: toDateStr(from), to: toDateStr(to) });

  switch (p.key) {
    case "today":
      return range(today, today);
    case "week":
      return range(mondayOf(today), today);
    case "lastWeek": {
      const monday = addDays(mondayOf(today), -7);
      return range(monday, addDays(monday, 6));
    }
    case "month":
      return range(new Date(today.getFullYear(), today.getMonth(), 1), today);
    case "lastMonth":
      return range(
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0),
      );
    case "custom":
      return p.from && p.to ? { from: p.from, to: p.to } : {};
    default:
      return {};
  }
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const periodFromQuery = (q: LocationQuery): PeriodState => {
  const from = typeof q.from === "string" && DATE_RE.test(q.from) ? q.from : undefined;
  const to = typeof q.to === "string" && DATE_RE.test(q.to) ? q.to : undefined;
  if (from && to) return { key: "custom", from, to };

  const key = PERIOD_PRESETS.find((x) => x.key === q.period)?.key;
  return { key: key ?? "all" };
};

export const periodToQuery = (p: PeriodState): Record<string, string> =>
  p.key === "custom" && p.from && p.to
    ? { from: p.from, to: p.to }
    : p.key === "all"
      ? {}
      : { period: p.key };

// ── Formatlash ─────────────────────────────────────────────────────
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const WEEKDAYS = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Sha"];

export const formatNumber = (v: number | null | undefined) =>
  Number(v ?? 0).toLocaleString("ru-RU");

/** "30 sen" */
export const formatDay = (value: string | Date) => {
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "30 sen 2026" */
export const formatDayYear = (value: string | Date) => {
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const weekday = (value: string | Date) => WEEKDAYS[new Date(value).getDay()];

export const formatDateTime = (value: string | Date) => {
  const d = new Date(value);
  return `${formatDayYear(d)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** "23 sen – 30 sen 2026" */
export const periodLabel = (from: string, to: string) => {
  const a = new Date(from);
  const b = new Date(to);
  if (toDateStr(a) === toDateStr(b)) return formatDayYear(a);
  return a.getFullYear() === b.getFullYear()
    ? `${formatDay(a)} – ${formatDayYear(b)}`
    : `${formatDayYear(a)} – ${formatDayYear(b)}`;
};

export const relativeTime = (value: string | null) => {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "hozirgina";
  if (min < 60) return `${min} daq oldin`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} kun oldin`;
  return formatDayYear(value);
};

// ── Foydalanuvchi ──────────────────────────────────────────────────
export const initials = (name: string | null) =>
  (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const avatarHue = (id: number) => (id * 47) % 360;

// 1–3 o'rin medallari: oltin, kumush, bronza.
export const MEDAL_COLORS = ["#f5b400", "#9aa7b4", "#cd7f32"];

// ── Hamyon tarixi ──────────────────────────────────────────────────
export const TX_TYPES: { value: CoinTxType; label: string }[] = [
  { value: "Steps", label: "Qadam" },
  { value: "Referral", label: "Referral" },
  { value: "Purchase", label: "Xarid" },
  { value: "Admin", label: "Admin" },
  { value: "CaloraExchange", label: "Calora almashtirish" },
];

export const TX_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TX_TYPES.map((x) => [x.value, x.label]),
);

const TX_TITLES: Record<string, string> = {
  coin_tx_daily_steps: "Kunlik qadamlar uchun",
  coin_tx_referral: "Do'st taklif qilgani uchun",
  coin_tx_referral_welcome: "Taklif kodi bilan kirgani uchun",
};

/** Hamyon yozuvi nomi — mobile lokalizatsiya kaliti, o'qiladigan matnga. */
export const txTitle = (title: string) => {
  if (TX_TITLES[title]) return TX_TITLES[title];
  const premium = /^mi_premium_(\d+)$/.exec(title);
  if (premium) return `Premium ${premium[1]} kun (do'kon)`;
  return title;
};

// ── Foiz / so'm ────────────────────────────────────────────────────
/** 0..1 ulush → "12,5%". */
export const formatPercent = (share: number | null | undefined, digits = 1) =>
  `${(Number(share ?? 0) * 100).toLocaleString("ru-RU", { maximumFractionDigits: digits })}%`;

/** So'm (backend tiyindan o'girgan) → "1 250 000 so'm". */
export const formatSom = (v: number | null | undefined) =>
  `${Math.round(Number(v ?? 0)).toLocaleString("ru-RU")} so'm`;

/** Kasr son: "3,5". */
export const formatDecimal = (v: number | null | undefined, digits = 1) =>
  Number(v ?? 0).toLocaleString("ru-RU", { maximumFractionDigits: digits });

// ── API xatolari (mutatsiyalar `silent` — matnni sahifa ko'rsatadi) ──
const API_ERRORS: Record<string, string> = {
  coin_rule_past_date: "Qoida faqat bugundan yoki kelajakdagi kundan kuchga kirishi mumkin",
  coin_rule_locked: "O'tgan kunlardagi qoidani o'zgartirib yoki o'chirib bo'lmaydi",
  coin_rule_not_found: "Qoida topilmadi",
  coin_rule_invalid: "Qadam va limit kamida 1 bo'lishi kerak",
  market_item_in_use: "Bu tarif sotib olingan — uni o'chirib bo'lmaydi, faolsizlantiring",
  market_item_invalid: "Premium tarif 1 kundan 3650 kungacha bo'lishi kerak",
  market_item_not_found: "Mahsulot topilmadi",
};

export const apiErrorMessage = (e: unknown, fallback = "Saqlab bo'lmadi") => {
  const data = (e as any)?.response?.data;
  const key: string | undefined = typeof data?.error === "string" ? data.error : undefined;
  if (key && API_ERRORS[key]) return API_ERRORS[key];
  const raw = JSON.stringify(data ?? "");
  const found = Object.keys(API_ERRORS).find((k) => raw.includes(k));
  if (found) return API_ERRORS[found];
  const model = data?.modelStateError?.[0]?.message ?? data?.modelStateError?.[0]?.errors?.[0];
  return model || key || fallback;
};

// ── Do'kon ─────────────────────────────────────────────────────────
/** Mobile lokalizatsiya kalitlari (uz) — do'kon kartasidagi qisqa izoh. */
export const MARKET_SUBTITLES: { value: string; label: string }[] = [
  { value: "mi_premium_7_sub", label: "Sinab ko'rish uchun" },
  { value: "mi_premium_30_sub", label: "To'liq bir oy" },
  { value: "mi_premium_75_sub", label: "Foydali tanlov" },
  { value: "mi_premium_120_sub", label: "Eng tejamkor" },
];

export const subtitleLabel = (subtitle: string | null | undefined) =>
  !subtitle ? "" : (MARKET_SUBTITLES.find((x) => x.value === subtitle)?.label ?? subtitle);

export const REWARD_TYPE_LABEL: Record<string, string> = {
  PremiumDays: "Premium kunlar",
  AiScans: "AI skanlar",
  Coupon: "Chegirma kuponi",
  Voucher: "Vaucher",
};

/** Do'kon mahsuloti nomi: Premium tarif — "Premium 30 kun". */
export const marketItemLabel = (x: { title: string; rewardType: string; rewardValue: number }) =>
  x.rewardType === "PremiumDays" ? `Premium ${x.rewardValue} kun` : txTitle(x.title);
