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
