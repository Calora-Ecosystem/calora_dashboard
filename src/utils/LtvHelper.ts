// LTV (lifetime value) va retention hisoblari.
//
// Manba: GET /dashboard/orders/subscriptions — har bir obuna buyurtmasi
// (userId, tarif, muddat, summa, sana, provayder). Alohida backend endpoint
// yo'q, shuning uchun hammasi mijoz tomonida hisoblanadi.
//
// Muhim cheklov: App Store / Google Play (IAP) obunasi avtomatik yangilanganda
// backend yangi buyurtma yaratmaydi — faqat obuna tugash sanasini suradi
// (RevenueCat RENEWAL). Shuning uchun IAP yangilanishlari userning obuna qatori
// (GET /dashboard/subscriptions/{userId}) dan taxminan tiklanadi va
// `inferred: true` bilan belgilanadi.

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

// GET /dashboard/subscriptions/{userId}
export type StoreSubscription = {
  userId: number;
  plan: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export type Payment = {
  orderId: number;
  at: Date;
  amount: number;
  plan: string;
  months: number;
  provider: string;
  inferred?: boolean; // store avto-yangilanishi, obuna tugash sanasidan taxminlangan
};

export type Period = { start: Date; end: Date };

// renewed  — birinchi muddat tugaguncha (+ imtiyozli kunlar) yana to'ladi
// late     — keyinroq qaytib to'ladi
// pending  — birinchi muddati hali tugamagan, qaror qilish vaqti bor
// churned  — muddat tugadi, qayta to'lamadi
// unknown  — IAP: store yangilanishini tiklab bo'lmadi
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
// Obuna qatori IAP xaridiga tegishli deb hisoblanishi uchun StartsAt xarid
// sanasiga shuncha kun yaqin bo'lishi kerak (coin/admin premiumi qatorni qayta yozadi).
const STORE_MATCH_DAYS = 3;
// Tugash sanasidan shuncha kun oldingi yangilanish sanasi hisobga olinmaydi.
const STORE_TOLERANCE_DAYS = 2;

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

// Obuna qatori faqat oxirgi xaridni aks ettiradi: oxirgi to'lov IAP bo'lsa va
// qator o'sha xariddan boshlangan bo'lsa, tugash sanasigacha har davr boshida
// store to'lov olgan deb hisoblaymiz. null — tiklab bo'lmaydi.
const inferStoreRenewals = (
  payments: Payment[],
  sub: StoreSubscription | null | undefined,
  now: Date,
): Payment[] | null => {
  const last = payments[payments.length - 1];
  if (!isStoreProvider(last.provider)) return [];
  if (!sub || sub.plan === "Free") return null;
  if (Math.abs(new Date(sub.startsAt).getTime() - last.at.getTime()) > STORE_MATCH_DAYS * DAY) return null;

  const limit = Math.min(new Date(sub.endsAt).getTime() - STORE_TOLERANCE_DAYS * DAY, now.getTime());
  const renewals: Payment[] = [];
  for (let k = 1; k <= 120; k++) {
    const at = addMonths(last.at, last.months * k);
    if (at.getTime() >= limit) break;
    renewals.push({ ...last, at, inferred: true });
  }
  return renewals;
};

export const buildLtvUsers = (
  orders: SubscriptionOrderDto[],
  storeSubs: Map<number, StoreSubscription | null> | null,
  now = new Date(),
): LtvUser[] => {
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

    const renewals = storeSubs ? inferStoreRenewals(payments, storeSubs.get(userId), now) : null;
    const storeTracked = renewals !== null || !isStoreProvider(payments[payments.length - 1].provider);
    if (renewals?.length) payments.push(...renewals);

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
    else if (!storeTracked) status = "unknown";
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

/* ---------------- Kalendar kohortlari ---------------- */

export type CohortBuyer = { user: LtvUser; payments: Payment[] };

export type CohortCell = {
  month: number;
  buyers: CohortBuyer[]; // shu oyda to'lov qilganlar
  active: LtvUser[]; // shu oyda to'langan obunasi amalda bo'lganlar
  revenue: number;
  inferredBuyers: number; // faqat taxminiy store yangilanishi bilan kirganlar
};

export type CalendarCohort = {
  cohort: number;
  users: LtvUser[];
  revenue: number;
  cells: (CohortCell | null)[]; // months bilan bir xil tartibda; kohortdan oldingi oylar — null
};

export type MonthTotal = {
  month: number;
  payers: number;
  newBuyers: number;
  returning: number;
  payments: number;
  revenue: number;
};

export type CalendarTable = { months: number[]; rows: CalendarCohort[]; totals: MonthTotal[] };

export const buildCalendarTable = (users: LtvUser[], now = new Date()): CalendarTable => {
  if (!users.length) return { months: [], rows: [], totals: [] };
  const current = monthIndex(now);
  const firstMonth = Math.min(...users.map((u) => u.cohort));
  const months: number[] = [];
  for (let m = firstMonth; m <= current; m++) months.push(m);

  const paymentsIn = (u: LtvUser, m: number) => u.payments.filter((p) => monthIndex(p.at) === m);

  const groups = new Map<number, LtvUser[]>();
  for (const u of users) groups.set(u.cohort, [...(groups.get(u.cohort) ?? []), u]);

  const rows: CalendarCohort[] = [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([cohort, members]) => ({
      cohort,
      users: members,
      revenue: members.reduce((s, u) => s + u.totalPaid, 0),
      cells: months.map((m) => {
        if (m < cohort) return null;
        const from = monthStart(m);
        const to = monthStart(m + 1);
        const buyers: CohortBuyer[] = [];
        let revenue = 0;
        let inferredBuyers = 0;
        for (const u of members) {
          const pays = paymentsIn(u, m);
          if (!pays.length) continue;
          buyers.push({ user: u, payments: pays });
          revenue += pays.reduce((s, p) => s + p.amount, 0);
          if (pays.every((p) => p.inferred)) inferredBuyers++;
        }
        const active = members.filter((u) => u.periods.some((p) => p.start < to && p.end > from));
        return { month: m, buyers, active, revenue, inferredBuyers };
      }),
    }));

  const totals: MonthTotal[] = months.map((m) => {
    let payers = 0;
    let newBuyers = 0;
    let payments = 0;
    let revenue = 0;
    for (const u of users) {
      const pays = paymentsIn(u, m);
      if (!pays.length) continue;
      payers++;
      if (u.cohort === m) newBuyers++;
      payments += pays.length;
      revenue += pays.reduce((s, p) => s + p.amount, 0);
    }
    return { month: m, payers, newBuyers, returning: payers - newBuyers, payments, revenue };
  });

  return { months, rows, totals };
};

const MONTHS_UZ = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
// "Iyun" / "Iyul" ning dastlabki 3 harfi bir xil, shuning uchun qisqa nomlar alohida
const MONTHS_UZ_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

export const monthName = (index: number) => MONTHS_UZ[index % 12];
export const monthYear = (index: number) => Math.floor(index / 12);
export const monthLabel = (index: number) => `${monthName(index)} ${monthYear(index)}`;
export const monthShort = (index: number) => `${MONTHS_UZ_SHORT[index % 12]} ${String(monthYear(index)).slice(2)}`;

export const planKey = (p: Pick<Payment, "plan" | "months">) => `${p.plan}|${p.months}`;

export const planLabel = (plan: string, months: number) => {
  const name = plan === "Family" ? "Oilaviy" : plan;
  const dur = months % 12 === 0 ? (months === 12 ? "1 yil" : `${months / 12} yil`) : `${months} oy`;
  return `${name} · ${dur}`;
};
