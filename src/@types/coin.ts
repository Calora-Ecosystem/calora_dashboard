// Coin reytingi (dashboard/coins/*). Backend enumlarni string nomi bilan qaytaradi.
export type CoinTxType = "CaloraExchange" | "Referral" | "Purchase" | "Admin" | "Steps";

export type CoinPeriodQuery = { from?: string; to?: string };

export type CoinSummaryDto = {
  from: string;
  to: string;
  participants: number;
  earned: number;
  stepCoins: number;
  bonusCoins: number;
  spent: number;
  avgPerParticipant: number;
  balanceInCirculation: number;
  stepsPerCoin: number;
  maxDailyCoins: number;
};

export type CoinRankingRowDto = {
  rank: number;
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  earned: number;
  stepCoins: number;
  bonusCoins: number;
  activeDays: number;
  maxedDays: number;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastEarnedAt: string | null;
};

export type CoinDayDto = {
  date: string;
  steps: number;
  stepCoins: number;
  bonusCoins: number;
  spent: number;
  earned: number;
  /** O'sha kunda amal qilgan qoida. */
  stepsPerCoin?: number;
  maxDailyCoins?: number;
};

export type UserCoinsDto = {
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  registeredAt: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  todayCoins: number;
  from: string;
  to: string;
  rank: number | null;
  participants: number;
  earned: number;
  stepCoins: number;
  bonusCoins: number;
  spent: number;
  activeDays: number;
  maxedDays: number;
  totalSteps: number;
  bestDay: CoinDayDto | null;
  stepsPerCoin: number;
  maxDailyCoins: number;
  days: CoinDayDto[];
};

export type CoinTransactionDto = {
  id: number;
  title: string;
  amount: number;
  type: CoinTxType;
  createdAt: string;
  stepDate: string | null;
  steps: number | null;
};

// ── Qadam → coin qoidasi (dashboard/coins/rules) ────────────────────
export type CoinRuleStatus = "Past" | "Current" | "Upcoming";

export type CoinRuleDto = {
  /** null — appsettings'dagi boshlang'ich qoida. */
  id: number | null;
  stepsPerCoin: number;
  maxDailyCoins: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
  status: CoinRuleStatus;
  editable: boolean;
  isDefault: boolean;
};

export type CoinRulesDto = {
  current: CoinRuleDto;
  next: CoinRuleDto | null;
  history: CoinRuleDto[];
  coinsEarnStartDate: string;
  today: string;
};

export type SaveCoinRuleDto = {
  stepsPerCoin: number;
  maxDailyCoins: number;
  /** "YYYY-MM-DD"; berilmasa bugun. */
  effectiveFrom?: string;
  note?: string;
};

export type CoinRuleImpactDto = {
  stepsPerCoin: number;
  maxDailyCoins: number;
  totalCoins: number;
  coinsPerDay: number;
  avgCoinsPerWalkerDay: number;
  cappedShare: number;
  earningShare: number;
  avgCoinsPerEarningDay: number;
};

export type CoinRulePreviewDto = {
  from: string;
  to: string;
  days: number;
  walkers: number;
  walkerDays: number;
  avgDailySteps: number;
  medianDailySteps: number;
  current: CoinRuleImpactDto;
  proposed: CoinRuleImpactDto;
};

// ── Coin do'koni (dashboard/market/*) ────────────────────────────────
export type MarketCategory = "Tariff" | "Voucher" | "Boost";
export type MarketRewardType = "PremiumDays" | "AiScans" | "Coupon" | "Voucher";

export type AdminMarketItemDto = {
  id: number;
  title: string;
  subtitle: string | null;
  priceCoins: number;
  category: MarketCategory;
  rewardType: MarketRewardType;
  rewardValue: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  visibleInApp: boolean;
  totalPurchases: number;
  purchases: number;
  coinsSpent: number;
  buyers: number;
  lastPurchaseAt: string | null;
  daysToEarn: number | null;
  coinsPerPremiumDay: number | null;
};

export type SaveMarketItemDto = {
  id?: number;
  title: string;
  subtitle?: string | null;
  priceCoins: number;
  category: MarketCategory;
  rewardType: MarketRewardType;
  rewardValue: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type MarketDayDto = { date: string; purchases: number; coinsSpent: number };

export type MarketSummaryDto = {
  from: string;
  to: string;
  purchases: number;
  buyers: number;
  coinsSpent: number;
  premiumDaysGranted: number;
  repeatBuyers: number;
  activeItems: number;
  cheapestPrice: number | null;
  canAffordCheapest: number;
  balanceInCirculation: number;
  avgCoinsPerEarningDay: number;
  stepsPerCoin: number;
  maxDailyCoins: number;
  days: MarketDayDto[];
};

export type MarketPurchaseDto = {
  id: number;
  createdAt: string;
  userId: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo: string | null;
  marketItemId: number;
  title: string;
  priceCoins: number;
  rewardType: MarketRewardType;
  rewardValue: number;
  code: string | null;
};
