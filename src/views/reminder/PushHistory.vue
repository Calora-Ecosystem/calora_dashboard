<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElDialog,
  ElMessage,
  ElMessageBox,
  ElTableColumn,
} from "element-plus";
import DataTable from "../../components/shared/DataTable.vue";
import { usePushHistoryStore } from "../../stores/pushHistoryStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { makeFileUrl } from "../../integrations/axios";
import { formatDate } from "../../utils/FormatHelper";
import { pushStatus } from "../../@types/pushHistory";
import type { GetNotificationDto, SentPushRecord } from "../../@types/pushHistory";

const router = useRouter();
const pushHistoryStore = usePushHistoryStore();
const notificationStore = useNotificationStore();

type Tab = "sent" | "inbox";
const tab = ref<Tab>("sent");

// ── Yuborganlarim (lokal tarix) ───────────────────────────────────
const history = computed(() => pushHistoryStore.history);

const stats = computed(() => {
  const list = history.value;
  const recipients = list.reduce((s, r) => s + (r.recipientCount || 0), 0);
  const scheduled = list.filter((r) => pushStatus(r) === "scheduled").length;
  return { total: list.length, recipients, scheduled };
});

const audienceStyle = (t: string) => {
  if (t === "all") return { bg: "var(--info-soft)", fg: "var(--info)" };
  if (t === "segment") return { bg: "var(--purple-soft)", fg: "var(--purple)" };
  return { bg: "var(--warning-soft)", fg: "var(--warning)" };
};
const audienceIcon = (t: string) =>
  t === "all" ? "Hammaga" : t === "segment" ? "Segment" : "Manual";

const fmtDateTime = (iso: string) => iso.slice(0, 16).replace("T", " ");

// Tafsilot oynasi
const detail = ref<SentPushRecord | null>(null);
const detailOpen = ref(false);
const openDetail = (r: SentPushRecord) => {
  detail.value = r;
  detailOpen.value = true;
};

const removeRecord = async (r: SentPushRecord) => {
  try {
    await ElMessageBox.confirm(
      "Bu yozuvni tarixdan o'chirasizmi? (Yuborilgan push bekor bo'lmaydi, faqat ro'yxatdan olib tashlanadi)",
      "Tasdiqlash",
      { type: "warning", confirmButtonText: "O'chirish", cancelButtonText: "Bekor" },
    );
    pushHistoryStore.remove(r.id);
    if (detail.value?.id === r.id) detailOpen.value = false;
    ElMessage.success("O'chirildi");
  } catch {
    /* bekor */
  }
};

const clearAll = async () => {
  try {
    await ElMessageBox.confirm(
      "Butun yuborish tarixini tozalaysizmi?",
      "Tasdiqlash",
      { type: "warning", confirmButtonText: "Tozalash", cancelButtonText: "Bekor" },
    );
    pushHistoryStore.clear();
    ElMessage.success("Tarix tozalandi");
  } catch {
    /* bekor */
  }
};

// ── Server qutisi (GET /notifications) ────────────────────────────
const inboxKey = ref(0);
const loadInbox = (skip: number, take: number) =>
  notificationStore.loadNotifications(skip, take);

const markRead = async (row: GetNotificationDto) => {
  if (row.hasRead) return;
  await notificationStore.markAsRead(row.id);
  row.hasRead = true;
  ElMessage.success("O'qilgan deb belgilandi");
};

const markAllRead = async () => {
  await notificationStore.markAllAsRead();
  ElMessage.success("Hammasi o'qilgan deb belgilandi");
  inboxKey.value++;
};

const goNew = () => router.push({ name: "push_campaigns" });
</script>

<template>
  <div>
    <!-- Sticky header -->
    <div class="form-header">
      <div class="flex items-center gap-3 min-w-0">
        <span class="hicon">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H5.17L4 17.17V4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>
        </span>
        <div class="min-w-0">
          <h1 class="text-[19px] font-bold truncate" style="color: var(--text)">Yuborilgan push'lar</h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">
            Yuborilgan va rejalashtirilgan bildirishnomalar ro'yxati
          </p>
        </div>
      </div>
      <button type="button" class="hbtn-save" @click="goNew">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Yangi push
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs mt-5">
      <button type="button" class="tab" :class="{ 'tab-on': tab === 'sent' }" @click="tab = 'sent'">
        Yuborganlarim
        <span class="tab-badge">{{ stats.total }}</span>
      </button>
      <button type="button" class="tab" :class="{ 'tab-on': tab === 'inbox' }" @click="tab = 'inbox'">
        Server qutisi
      </button>
    </div>

    <!-- TAB: Yuborganlarim -->
    <div v-if="tab === 'sent'" class="mt-5">
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-5">
        <div class="stat">
          <p class="stat-num">{{ stats.total }}</p>
          <p class="stat-lbl">Jami yuborish</p>
        </div>
        <div class="stat">
          <p class="stat-num">{{ stats.recipients.toLocaleString() }}</p>
          <p class="stat-lbl">Jami qabul qiluvchi</p>
        </div>
        <div class="stat">
          <p class="stat-num">{{ stats.scheduled }}</p>
          <p class="stat-lbl">Rejalashtirilgan</p>
        </div>
      </div>

      <section class="panel">
        <div class="flex items-center justify-between mb-4">
          <h2 class="panel-title">Tarix</h2>
          <button v-if="history.length" type="button" class="link-btn" @click="clearAll">Tarixni tozalash</button>
        </div>

        <div v-if="history.length" class="space-y-2.5">
          <div v-for="r in history" :key="r.id" class="row" @click="openDetail(r)">
            <img v-if="r.image" :src="makeFileUrl(r.image)" class="row-img" />
            <span v-else class="row-img row-img-ph">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="row-title">{{ r.title }}</p>
                <span
                  class="pill"
                  :style="{ background: audienceStyle(r.audienceType).bg, color: audienceStyle(r.audienceType).fg }"
                >{{ audienceIcon(r.audienceType) }}</span>
              </div>
              <p class="row-sub">{{ r.audienceLabel }} · {{ r.recipientCount.toLocaleString() }} ta</p>
            </div>
            <div class="row-meta">
              <span
                class="status"
                :class="pushStatus(r) === 'scheduled' ? 'status-sched' : 'status-sent'"
              >{{ pushStatus(r) === 'scheduled' ? 'Rejalashtirilgan' : 'Yuborilgan' }}</span>
              <span class="row-date">
                {{ pushStatus(r) === 'scheduled' && r.scheduled ? fmtDateTime(r.scheduled) : formatDate(r.createdAt) }}
              </span>
            </div>
            <button type="button" class="row-del" title="O'chirish" @click.stop="removeRecord(r)">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        <div v-else class="empty">
          <span class="empty-icon">
            <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </span>
          <p class="empty-title">Hozircha yuborilgan push yo'q</p>
          <p class="empty-sub">Bu ro'yxat "Push yuborish" va "Segmentli push"dan yuborgan har bir bildirishnomangizni ko'rsatadi.</p>
          <button type="button" class="hbtn-save mt-3" @click="goNew">Birinchi push'ni yuborish</button>
        </div>
      </section>
    </div>

    <!-- TAB: Server qutisi -->
    <div v-else class="mt-5">
      <section class="panel">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="panel-title">Server bildirishnomalari</h2>
            <p class="text-[12px] mt-0.5" style="color: var(--text-faint)">
              Bu sizning (admin) shaxsiy qutingiz — serverdagi barcha yuborilganlar emas. Yuborilgandan keyin bir necha soniya kechikishi mumkin.
            </p>
          </div>
          <ElButton size="small" @click="markAllRead">Hammasini o'qilgan qilish</ElButton>
        </div>

        <DataTable :key="inboxKey" :loader="loadInbox">
          <ElTableColumn label="Bildirishnoma" min-width="320">
            <template #default="{ row }">
              <div class="flex items-center gap-3 py-1">
                <img v-if="row.image" :src="makeFileUrl(row.image)" class="w-10 h-10 rounded-lg object-cover shrink-0" />
                <span v-else class="w-2 h-2 rounded-full shrink-0" :style="{ background: row.hasRead ? 'var(--border)' : 'var(--brand)' }"></span>
                <div class="min-w-0">
                  <p class="font-semibold text-[13.5px] truncate" style="color: var(--text)">{{ row.title || "—" }}</p>
                  <p class="text-[12px] truncate" style="color: var(--text-faint)">{{ row.description || "" }}</p>
                </div>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="Holat" width="120">
            <template #default="{ row }">
              <span class="status" :class="row.hasRead ? 'status-sent' : 'status-sched'">
                {{ row.hasRead ? "O'qilgan" : "Yangi" }}
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="Vaqt" width="160">
            <template #default="{ row }">
              <span class="text-[12.5px]" style="color: var(--text-muted)">{{ formatDate(row.sentAt) }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="" width="120" align="right">
            <template #default="{ row }">
              <ElButton v-if="!row.hasRead" size="small" @click="markRead(row)">O'qilgan</ElButton>
            </template>
          </ElTableColumn>
        </DataTable>
      </section>
    </div>

    <!-- Tafsilot oynasi -->
    <ElDialog v-model="detailOpen" :show-close="true" width="480px" :title="detail?.title || 'Push'">
      <template v-if="detail">
        <img v-if="detail.image" :src="makeFileUrl(detail.image)" class="w-full rounded-xl mb-4 object-cover" style="max-height: 220px" />
        <p class="text-[14px] whitespace-pre-wrap mb-4" style="color: var(--text)">{{ detail.description }}</p>
        <div class="dl">
          <div class="dl-row"><span>Auditoriya</span><b>{{ detail.audienceLabel }}</b></div>
          <div class="dl-row"><span>Qabul qiluvchilar</span><b>{{ detail.recipientCount.toLocaleString() }} ta</b></div>
          <div class="dl-row">
            <span>Holat</span>
            <b>{{ pushStatus(detail) === 'scheduled' ? 'Rejalashtirilgan' : 'Yuborilgan' }}</b>
          </div>
          <div v-if="detail.scheduled" class="dl-row"><span>Rejalashtirilgan vaqt</span><b>{{ fmtDateTime(detail.scheduled) }}</b></div>
          <div class="dl-row"><span>Yaratilgan</span><b>{{ formatDate(detail.createdAt) }}</b></div>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}
.hicon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-strong);
  background: var(--brand-soft);
}
.hbtn-save {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 6px 16px rgba(var(--brand-rgb), 0.3);
  transition: all 0.18s ease;
}
.hbtn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(var(--brand-rgb), 0.42);
}
.tabs {
  display: flex;
  gap: 6px;
  padding: 5px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: fit-content;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s ease;
}
.tab:hover {
  color: var(--text);
}
.tab-on {
  color: var(--text);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.tab-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-strong);
  background: var(--brand-soft);
}
.stat {
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.stat-num {
  font-size: 24px;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}
.stat-lbl {
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 6px;
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.link-btn {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--danger);
  transition: opacity 0.15s ease;
}
.link-btn:hover {
  opacity: 0.75;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
}
.row:hover {
  border-color: var(--brand);
}
.row-img {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  object-fit: cover;
  flex-shrink: 0;
}
.row-img-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-strong);
  background: var(--brand-soft);
}
.row-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-sub {
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pill {
  flex-shrink: 0;
  padding: 1px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.row-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.status {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.status-sent {
  color: var(--success);
  background: var(--success-soft);
}
.status-sched {
  color: var(--warning);
  background: var(--warning-soft);
}
.row-date {
  font-size: 11.5px;
  color: var(--text-faint);
}
.row-del {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--danger);
  background: var(--danger-soft);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.row:hover .row-del {
  opacity: 1;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
}
.empty-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-strong);
  background: var(--brand-soft);
  margin-bottom: 14px;
}
.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.empty-sub {
  font-size: 12.5px;
  color: var(--text-faint);
  margin-top: 4px;
  max-width: 360px;
}
.dl {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.dl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}
.dl-row span {
  color: var(--text-muted);
}
.dl-row b {
  color: var(--text);
  font-weight: 600;
  text-align: right;
}
</style>
