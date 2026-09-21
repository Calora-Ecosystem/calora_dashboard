// Dashboarddan yuborilgan push'lar tarixi. Backendda "kampaniya/yuborilganlar"
// endpointi yo'q (`GET /notifications` faqat joriy foydalanuvchi qutisini,
// kechikish bilan qaytaradi), shuning uchun har bir yuborish lokal (persisted)
// yozib boriladi — auditoriya va qabul qiluvchilar soni bilan.
export type PushAudienceType = "all" | "segment" | "manual";

export type SentPushRecord = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  audienceType: PushAudienceType;
  // Inson o'qiy oladigan auditoriya tavsifi (masalan "Barcha foydalanuvchilar",
  // "Segment · Kam faol", "3 ta tanlangan foydalanuvchi").
  audienceLabel: string;
  recipientCount: number;
  // Rejalashtirilgan bo'lsa ISO vaqt, aks holda null (hoziroq yuborilgan).
  scheduled: string | null;
  // Yuborish amali bajarilgan vaqt (ISO).
  createdAt: string;
};

// Server bildirishnomasi (`GET /notifications` — joriy foydalanuvchi qutisi).
export type GetNotificationDto = {
  id: number;
  userId: number;
  title: string | null;
  description: string | null;
  hasRead: boolean;
  sentAt: string;
  image: string | null;
};

// Rejalashtirilgan (kelajakdagi) yuborishmi yoki allaqachon yuborilganmi.
export const pushStatus = (r: SentPushRecord): "scheduled" | "sent" => {
  if (r.scheduled && new Date(r.scheduled).getTime() > Date.now()) return "scheduled";
  return "sent";
};
