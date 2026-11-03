// Dashboard: bepul AI skan limiti (dashboard/ai/scans/*).

export type ScanStatusFilter = "scanned" | "exhausted" | "available" | "free" | "premium" | "bonus" | "all";
export type ScanSort = "used" | "scans" | "remaining" | "recent" | "newest";
export type ScanPlan = "Free" | "Premium" | "Family";
export type ScanEventStatus = "Success" | "Warning" | "Error";

export type AdminScanSummaryDto = {
  freeLimit: number;
  freeUnlimited: boolean;
  freePlanActive: boolean;
  freeLimitConfigured: boolean;
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  freeUsersScanned: number;
  exhaustedUsers: number;
  usersWithBonus: number;
  bonusGranted: number;
  freeScansUsed: number;
  totalScans: number;
  successScans: number;
  emptyScans: number;
  errorScans: number;
  scansToday: number;
  scanners: number;
  distribution: { used: number; users: number }[];
};

export type AdminScanUserDto = {
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  registeredAt: string;
  plan: ScanPlan | null;
  isPremium: boolean;
  premiumEndsAt: string | null;
  unlimited: boolean;
  freeLimit: number;
  bonusLimit: number;
  limit: number;
  used: number;
  remaining: number;
  totalScans: number;
  successScans: number;
  errorScans: number;
  lastScanAt: string | null;
};

export type AdminScanEventDto = {
  id: number;
  createdAt: string;
  outcome: string;
  status: ScanEventStatus;
  durationMs: number | null;
  itemCount: number | null;
  mimeType: string | null;
  errorMessage: string | null;
};

export type AdminScanUserDetailDto = {
  user: AdminScanUserDto;
  events: AdminScanEventDto[];
};
