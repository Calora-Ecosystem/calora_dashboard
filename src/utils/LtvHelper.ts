// LTV (lifetime value) va retention hisoblari.
//
// Manba: GET /dashboard/orders/subscriptions — har bir obuna buyurtmasi
// (userId, tarif, muddat, summa, sana, provayder). Alohida backend endpoint
// yo'q, shuning uchun hammasi mijoz tomonida hisoblanadi.
//
// Muhim cheklov: App Store / Google Play (IAP) obunasi avtomatik yangilanganda
// backend yangi buyurtma yaratmaydi — faqat obuna tugash sanasini suradi
// (RevenueCat RENEWAL). Shuning uchun IAP foydalanuvchisining keyingi
// to'lovlari bu yerda ko'rinmaydi va ular "unknown" holatida qoladi.

export type SubscriptionOrderDto = {
  id: number;
  userId: number;
  userName: string;
  plan: string;
  planExtraId: number;
  planExtraDurationInMonths: number;
  orderStatus: string;
  amount: number;
  createdAt: string;
  paymentProvider: string;
  coupon?: { id: number; code: string } | null;
};

export type Payment = {
  orderId: number;
  at: Date;
  amount: number;
  plan: string;
  months: number;
  provider: string;
};

export type Period = { start: Date; end: Date };

// renewed  — birinchi muddat tugaguncha (+ imtiyozli kunlar) yana to'ladi
// late     — keyinroq qaytib to'ladi
// pending  — birinchi muddati hali tugamagan, qaror qilish vaqti bor
// churned  — muddat tugadi, qayta to'lamadi
// unknown  — IAP: store avto-yangilanishi buyurtmalarda ko'rinmaydi
export type RenewalStatus = "renewed" | "late" | "pending" | "churned" | "unknown";

export type LtvUser = {
  userId: number;
  userName: string;
  payments: Payment[];
  periods: Period[];
  first: Payment;
  cohort: number; // monthIndex(first.at)
  totalPaid: number;
  coveredMonths: number;
  paidUntil: Date;
  renewalDeadline: Date;
  secondPaymentAt: Date | null;
  status: RenewalStatus;
};

// Muddat tugaganidan keyin shuncha kun ichida to'lasa ham "o'z vaqtida" hisoblanadi
// (Payme/Click'da avto-yechish yo'q — user o'zi qayta to'laydi).
export const RENEWAL_GRACE_DAYS = 7;
export const COHORT_MONTHS = 13; // Xarid oyi + keyingi 12 oy

const DAY = 86_400_000;

export const isPaidOrder = (o: SubscriptionOrderDto) =>
  o.orderStatus === "Confirmed" && Number(o.amount) > 0;

export const isStoreProvider = (provider: string) => provider === "Iap";

export const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

export const monthStart = (index: number) =>
  new Date(Math.floor(index / 12), index % 12, 1);

// C# DateTime.AddMonths kabi: 31-yanvar + 1 oy = 28/29-fevral (backend ham shunday hisoblaydi)
export const addMonths = (d: Date, months: number) => {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + months);
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDay));
  return r;
};

export const buildLtvUsers = (orders: SubscriptionOrderDto[], now = new Date()): LtvUser[] => {
  const byUser = new Map<number, { name: string; payments: Payment[] }>();
  for (const o of orders) {
    if (!isPaidOrder(o)) continue;
    const entry = byUser.get(o.userId) ?? { name: o.userName, payments: [] };
    entry.payments.push({
      orderId: o.id,
      at: new Date(o.createdAt),
      amount: Number(o.amount) || 0,
      plan: o.plan,
      months: Math.max(1, Number(o.planExtraDurationInMonths) || 1),
      provider: o.paymentProvider,
    });
    byUser.set(o.userId, entry);
  }

  const users: LtvUser[] = [];
  for (const [userId, { name, payments }] of byUser) {
    payments.sort((a, b) => a.at.getTime() - b.at.getTime());

    // Backend kabi: faol obuna ustiga to'lansa yangi muddat eskisining oxiridan boshlanadi.
    const periods: Period[] = [];
    let end: Date | null = null;
    for (const p of payments) {
      const start: Date = end && p.at < end ? end : p.at;
      end = addMonths(start, p.months);
      periods.push({ start, end });
    }

    const first = payments[0];
    const firstEnd = addMonths(first.at, first.months);
    const renewalDeadline = new Date(firstEnd.getTime() + RENEWAL_GRACE_DAYS * DAY);
    const second = payments[1] ?? null;

    let status: RenewalStatus;
    if (second) status = second.at <= renewalDeadline ? "renewed" : "late";
    else if (now < renewalDeadline) status = "pending";
    else if (isStoreProvider(first.provider)) status = "unknown";
    else status = "churned";

    users.push({
      userId,
      userName: name,
      payments,
      periods,
      first,
      cohort: monthIndex(first.at),
      totalPaid: payments.reduce((s, p) => s + p.amount, 0),
      coveredMonths: payments.reduce((s, p) => s + p.months, 0),
      paidUntil: end!,
      renewalDeadline,
      secondPaymentAt: second?.at ?? null,
      status,
    });
  }
  return users;
};

export type RenewalStats = {
  decided: number; // birinchi muddati tugagan va natijasi ma'lum bo'lganlar
  renewed: number;
  late: number;
  churned: number;
  pending: number;
  unknown: number;
  rate: number; // renewed / decided, %
  returnRate: number; // (renewed + late) / decided, %
};

export const renewalStats = (users: LtvUser[]): RenewalStats => {
  const c = { renewed: 0, late: 0, churned: 0, pending: 0, unknown: 0 };
  for (const u of users) c[u.status]++;
  const decided = c.renewed + c.late + c.churned;
  return {
    ...c,
    decided,
    rate: decided ? (c.renewed / decided) * 100 : 0,
    returnRate: decided ? ((c.renewed + c.late) / decided) * 100 : 0,
  };
};

export type CohortRow = {
  cohort: number;
  label: string;
  size: number;
  revenue: number;
  // index = xariddan keyingi oy (0 = xarid oyi); null = bu oy hali kelmagan
  paid: (number | null)[]; // shu oyda to'lov qilganlar soni
  active: (number | null)[]; // shu oyda obunasi faol bo'lganlar soni
  cumRevenue: (number | null)[]; // 0..k oylardagi jami tushum
  currentMonthOffset: number; // joriy (tugamagan) oy indeksi
};

const MONTHS_UZ = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

export const monthLabel = (index: number) =>
  `${MONTHS_UZ[index % 12]} ${Math.floor(index / 12)}`;

export const buildCohorts = (users: LtvUser[], now = new Date()): CohortRow[] => {
  const current = monthIndex(now);
  const groups = new Map<number, LtvUser[]>();
  for (const u of users) {
    const list = groups.get(u.cohort) ?? [];
    list.push(u);
    groups.set(u.cohort, list);
  }

  const rows: CohortRow[] = [];
  for (const [cohort, members] of groups) {
    const maxK = Math.min(COHORT_MONTHS - 1, current - cohort);
    const paid: (number | null)[] = [];
    const active: (number | null)[] = [];
    const cumRevenue: (number | null)[] = [];
    let cum = 0;

    for (let k = 0; k < COHORT_MONTHS; k++) {
      if (k > maxK) {
        paid.push(null);
        active.push(null);
        cumRevenue.push(null);
        continue;
      }
      const mFrom = monthStart(cohort + k);
      const mTo = monthStart(cohort + k + 1);
      let paidCount = 0;
      let activeCount = 0;
      for (const u of members) {
        const monthPays = u.payments.filter((p) => monthIndex(p.at) === cohort + k);
        if (monthPays.length) paidCount++;
        cum += monthPays.reduce((s, p) => s + p.amount, 0);
        if (u.periods.some((p) => p.start < mTo && p.end > mFrom)) activeCount++;
      }
      paid.push(paidCount);
      active.push(activeCount);
      cumRevenue.push(cum);
    }

    rows.push({
      cohort,
      label: monthLabel(cohort),
      size: members.length,
      revenue: members.reduce((s, u) => s + u.totalPaid, 0),
      paid,
      active,
      cumRevenue,
      currentMonthOffset: current - cohort,
    });
  }
  return rows.sort((a, b) => b.cohort - a.cohort);
};

// Barcha kohortlar bo'yicha o'rtacha egri chiziq. k-oy uchun faqat shu oyni
// to'liq o'tgan kohortlar olinadi (joriy, tugamagan oy natijani pasaytirmasin);
// xarid oyi (k = 0) esa har doim to'liq. Har oyda kohortlar to'plami
// o'zgargani uchun LTV oylik o'sishlar zanjiri sifatida yig'iladi — aks holda
// eski (kichik) kohortlar ustun bo'lgan oylarda egri chiziq pasayib ketardi.
export type CurvePoint = { k: number; ltv: number | null; paidPct: number | null; activePct: number | null; cohorts: number };

export const buildCurve = (rows: CohortRow[]): CurvePoint[] => {
  const points: CurvePoint[] = [];
  let ltv = 0;
  for (let k = 0; k < COHORT_MONTHS; k++) {
    const eligible = rows.filter((r) => r.paid[k] !== null && (k === 0 || k < r.currentMonthOffset));
    const size = eligible.reduce((s, r) => s + r.size, 0);
    if (!size) {
      points.push({ k, ltv: null, paidPct: null, activePct: null, cohorts: 0 });
      continue;
    }
    const sum = (pick: (r: CohortRow) => number | null) =>
      eligible.reduce((s, r) => s + (pick(r) ?? 0), 0);
    ltv += sum((r) => (r.cumRevenue[k] ?? 0) - (k ? r.cumRevenue[k - 1] ?? 0 : 0)) / size;
    points.push({
      k,
      ltv,
      paidPct: (sum((r) => r.paid[k]) / size) * 100,
      activePct: (sum((r) => r.active[k]) / size) * 100,
      cohorts: eligible.length,
    });
  }
  return points;
};

export const planKey = (p: Pick<Payment, "plan" | "months">) => `${p.plan}|${p.months}`;

export const planLabel = (plan: string, months: number) => {
  const name = plan === "Family" ? "Oilaviy" : plan;
  const dur = months % 12 === 0 ? (months === 12 ? "1 yil" : `${months / 12} yil`) : `${months} oy`;
  return `${name} · ${dur}`;
};
