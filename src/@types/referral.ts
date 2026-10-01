// Referral ("Do'stni taklif qilish") analitikasi — dashboard/referrals/*.
// Summalar so'mda (backend tiyindan o'giradi), ulushlar 0..1.

export type ReferralPeriodQuery = { from?: string; to?: string };

export type ReferralProgramDto = {
  friendsGoal: number;
  premiumDays: number;
  discountPercent: number;
  referrerReward: number;
  referredReward: number;
  applyWindowDays: number;
};

export type ReferralDayDto = {
  date: string;
  codes: number;
  invited: number;
  activated: number;
  firstPayments: number;
  premiumGrants: number;
};

export type ReferralSummaryDto = {
  from: string;
  to: string;
  codesCreated: number;
  sharers: number;
  invited: number;
  activated: number;
  pending: number;
  paid: number;
  referrers: number;
  avgInvitesPerReferrer: number;
  codeConversion: number;
  activationRate: number;
  paidRate: number;
  avgHoursToActivate: number | null;
  avgDaysToFirstPayment: number | null;
  newUsers: number;
  newUsersReferred: number;
  referralShareOfNewUsers: number;
  revenue: number;
  orders: number;
  revenuePerPaid: number;
  discountsUsed: number;
  discountGiven: number;
  premiumGrants: number;
  premiumDaysGranted: number;
  coinsRewarded: number;
  nearMilestone: number;
  totalInvited: number;
  totalActivated: number;
  totalReferrers: number;
  totalPremiumGrants: number;
  program: ReferralProgramDto;
  days: ReferralDayDto[];
};

export type ReferrerSort = "invited" | "activated" | "paid" | "revenue" | "recent";

export type ReferrerRowDto = {
  rank: number;
  userId: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo: string | null;
  registeredAt: string | null;
  isDeleted: boolean;
  isPremium: boolean;
  invited: number;
  activated: number;
  pending: number;
  paid: number;
  revenue: number;
  codesCreated: number;
  activationRate: number;
  firstInviteAt: string;
  lastInviteAt: string;
  totalInvited: number;
  totalActivated: number;
  premiumGrants: number;
  premiumDays: number;
  friendsLeft: number;
};

export type ReferralStatus = "Joined" | "Active" | "Paid";

export type ReferralRowDto = {
  id: number;
  code: string | null;
  createdAt: string;
  activatedAt: string | null;
  status: ReferralStatus;
  referrerId: number;
  referrerName: string | null;
  referrerContact: string | null;
  referredUserId: number;
  referredName: string | null;
  referredContact: string | null;
  referredPhoto: string | null;
  referredRegisteredAt: string | null;
  referredDeleted: boolean;
  daysAfterSignup: number | null;
  firstPaymentAt: string | null;
  orders: number;
  revenue: number;
  discountUsedAt: string | null;
  isPremium: boolean;
};

export type ReferrerGrantDto = { milestone: number; days: number; createdAt: string };

export type ReferrerDetailDto = {
  userId: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo: string | null;
  registeredAt: string;
  isPremium: boolean;
  premiumEndsAt: string | null;
  invited: number;
  activated: number;
  pending: number;
  paid: number;
  revenue: number;
  codesCreated: number;
  latestCode: string | null;
  lastCodeAt: string | null;
  firstInviteAt: string | null;
  lastInviteAt: string | null;
  friendsGoal: number;
  progressFriends: number;
  friendsLeft: number;
  grants: ReferrerGrantDto[];
  referredById: number | null;
  referredByName: string | null;
  referredAt: string | null;
  days: ReferralDayDto[];
};
