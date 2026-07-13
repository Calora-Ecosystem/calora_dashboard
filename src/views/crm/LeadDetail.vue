<script setup lang="ts">
import {
  ElInput,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSelect,
  ElOption,
  ElDatePicker,
} from "element-plus";
import { onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "./components/Icon.vue";
import {
  useCrmStore,
  type LeadDetailDto,
  type LeadActivityDto,
  type LeadStatus,
  type NoteDto,
} from "../../stores/crmStore";
import { LEAD_STATUSES } from "../../constants/ApiContstants";
import {
  STATUS_META,
  TEMP_META,
  PAYMENT_META,
  canMoveLead,
  initials,
  avatarHue,
  relativeTime,
} from "./crmMeta";
import { formatMoney } from "../../utils/FormatHelper";

const route = useRoute();
const router = useRouter();
const crmStore = useCrmStore();

const leadId = Number(route.params.leadId);
const lead = ref<LeadDetailDto | null>(null);
const timeline = ref<LeadActivityDto[]>([]);
const notes = ref<NoteDto[]>([]);

const noteText = ref("");
const fuDate = ref<string | null>(null);
const fuNote = ref("");

const purposeLabels: Record<string, string> = {
  LoseWeight: "Vazn yo'qotish",
  GainWeight: "Vazn olish",
  KeepFit: "Formani saqlash",
  BuildMuscle: "Mushak yig'ish",
};

const ACTIVITY_ICON: Record<string, string> = {
  Registered: "user-plus",
  SubscriptionOpened: "eye",
  WorkoutStarted: "zap",
  WaterTracked: "activity",
  FoodTracked: "activity",
  AppOpened: "smartphone",
  Assigned: "user",
  Contacted: "phone",
  StatusChanged: "arrow-right",
  NoteAdded: "message",
  FollowUpSet: "clock",
  FollowUpDue: "alert-triangle",
  Won: "check-circle",
  Lost: "x",
};

const load = async () => {
  const [l, t, n] = await Promise.all([
    crmStore.getLeadById(leadId),
    crmStore.getLeadTimeline(leadId),
    crmStore.getLeadNotes(leadId),
  ]);
  lead.value = l.content;
  timeline.value = t.content ?? [];
  notes.value = n.content ?? [];
};

onMounted(load);

const reloadMeta = async () => {
  const [l, t] = await Promise.all([
    crmStore.getLeadById(leadId),
    crmStore.getLeadTimeline(leadId),
  ]);
  lead.value = l.content;
  timeline.value = t.content ?? [];
};

const contact = async () => {
  await crmStore.contactLead(leadId);
  ElMessage.success("Bog'lanildi deb belgilandi");
  await reloadMeta();
};

const changeStatus = async (status: LeadStatus) => {
  if (!lead.value || status === lead.value.status) return;
  let reason: string | undefined;
  if (status === "Lost") {
    try {
      const { value } = await ElMessageBox.prompt("Yo'qotish sababi", "Lead yo'qotildi", {
        confirmButtonText: "Saqlash",
        cancelButtonText: "Bekor",
        inputPattern: /.+/,
        inputErrorMessage: "Sabab majburiy",
      });
      reason = value;
    } catch {
      return;
    }
  }
  await crmStore.moveStatus(leadId, status, reason);
  ElMessage.success(`Holat: ${STATUS_META[status].label}`);
  await reloadMeta();
};

const addNote = async () => {
  if (!noteText.value.trim()) return;
  await crmStore.upsertLeadNote(leadId, { text: noteText.value.trim() });
  noteText.value = "";
  const [n, t] = await Promise.all([
    crmStore.getLeadNotes(leadId),
    crmStore.getLeadTimeline(leadId),
  ]);
  notes.value = n.content ?? [];
  timeline.value = t.content ?? [];
};

const removeNote = async (id: number) => {
  await crmStore.deleteNote(id);
  notes.value = notes.value.filter((x) => x.id !== id);
};

const setFollowUp = async () => {
  if (!fuDate.value) {
    ElMessage.warning("Sanani tanlang");
    return;
  }
  await crmStore.createFollowUp(leadId, new Date(fuDate.value).toISOString(), fuNote.value || undefined);
  ElMessage.success("Follow-up belgilandi");
  fuDate.value = null;
  fuNote.value = "";
  await reloadMeta();
};

const tempMeta = computed(() => (lead.value ? TEMP_META[lead.value.temperature] : null));

// Faqat ruxsat etilgan holatlar (Yangi → faqat Bog'lanish) + joriy holat.
const statusOptions = computed(() =>
  lead.value
    ? LEAD_STATUSES.filter((s) => s === lead.value!.status || canMoveLead(lead.value!.status, s))
    : [],
);
</script>

<template>
  <div v-if="lead" class="page">
    <button class="back" @click="router.back()"><Icon name="arrow-left" :size="16" /> Orqaga</button>

    <div class="detail-grid">
      <!-- Left -->
      <div class="col-left">
        <section class="app-card profile">
          <div class="profile-head">
            <div class="avatar-lg" :style="{ background: `hsl(${avatarHue(lead.id)} 70% 92%)`, color: `hsl(${avatarHue(lead.id)} 65% 38%)` }">
              {{ initials(lead.userName) }}
            </div>
            <div class="min-w-0 grow">
              <h1 class="name">{{ lead.userName ?? "Noma'lum" }}</h1>
              <div class="contacts">
                <span v-if="lead.userPhone"><Icon name="phone" :size="13" /> {{ lead.userPhone }}</span>
                <span v-if="lead.userEmail"><Icon name="mail" :size="13" /> {{ lead.userEmail }}</span>
              </div>
              <div class="badges">
                <span class="status-badge" :style="{ background: STATUS_META[lead.status].soft, color: STATUS_META[lead.status].color }">
                  <Icon :name="STATUS_META[lead.status].icon" :size="12" /> {{ STATUS_META[lead.status].label }}
                </span>
              </div>
            </div>
            <span v-if="tempMeta" class="temp-lg" :style="{ background: tempMeta.soft, color: tempMeta.color }">
              <Icon :name="tempMeta.icon" :size="16" /> {{ lead.score }}
            </span>
          </div>

          <div class="info-grid">
            <div class="info"><span>Yosh</span><b>{{ lead.age ?? "—" }}</b></div>
            <div class="info"><span>Jinsi</span><b>{{ lead.gender ?? "—" }}</b></div>
            <div class="info"><span>Vazn</span><b>{{ lead.weight ? lead.weight + " kg" : "—" }}</b></div>
            <div class="info"><span>Bo'y</span><b>{{ lead.height ? lead.height + " sm" : "—" }}</b></div>
            <div class="info"><span>Maqsad</span><b>{{ lead.purpose ? (purposeLabels[lead.purpose] ?? lead.purpose) : "—" }}</b></div>
            <div class="info"><span>Ro'yxatdan</span><b>{{ relativeTime(lead.createdAt) }}</b></div>
            <div class="info"><span>Oxirgi faollik</span><b>{{ relativeTime(lead.lastActivity) }}</b></div>
          </div>

          <div v-if="lead.status === 'Won'" class="won-box">
            <Icon name="check-circle" :size="18" />
            <div>
              <b>Sotuv yakunlandi — {{ formatMoney(lead.wonAmount ?? 0) }}</b>
              <span v-if="lead.promoCode" class="pay-kind promo">
                <Icon name="sparkles" :size="12" /> Promo-code: {{ lead.promoCode }}
              </span>
              <span v-else-if="lead.paymentProvider" class="pay-kind" :class="PAYMENT_META[lead.paymentProvider].kind">
                <Icon :name="PAYMENT_META[lead.paymentProvider].kind === 'card' ? 'credit-card' : 'smartphone'" :size="12" />
                {{ PAYMENT_META[lead.paymentProvider].label }}
              </span>
            </div>
          </div>
        </section>

        <section class="app-card block">
          <h2 class="sec-title"><Icon name="activity" :size="16" /> Faollik ko'rsatkichlari</h2>
          <div class="hl-metric" :class="{ won: lead.purchased }">
            <span class="hl-icon"><Icon name="eye" :size="20" /></span>
            <div class="min-w-0 grow">
              <div class="hl-label">Premium sahifasini ochgan</div>
              <div class="hl-value">{{ lead.subscriptionOpenedCount }} marta</div>
            </div>
            <span v-if="lead.purchased" class="hl-tag">
              <Icon name="check-circle" :size="13" />
              {{ lead.subscriptionOpenedCount || 1 }} urinishda sotib oldi
            </span>
          </div>
          <div class="eng-grid">
            <div class="eng"><span class="eng-ic"><Icon name="smartphone" :size="15" /></span><b>{{ lead.appOpenCount ?? 0 }}</b><small>Ilovaga kirdi</small></div>
            <div class="eng"><span class="eng-ic"><Icon name="zap" :size="15" /></span><b>{{ lead.workoutStartedCount ?? 0 }}</b><small>Mashg'ulot</small></div>
            <div class="eng"><span class="eng-ic"><Icon name="activity" :size="15" /></span><b>{{ lead.waterTrackedCount ?? 0 }}</b><small>Suv tracking</small></div>
            <div class="eng"><span class="eng-ic"><Icon name="activity" :size="15" /></span><b>{{ lead.foodTrackedCount ?? 0 }}</b><small>Ovqat tracking</small></div>
          </div>
        </section>

        <section class="app-card block">
          <h2 class="sec-title"><Icon name="zap" :size="16" /> Harakatlar</h2>
          <div class="actions-row">
            <button class="act-btn primary" @click="contact"><Icon name="phone" :size="15" /> Bog'lanildi</button>
            <ElSelect :model-value="lead.status" placeholder="Holat" class="status-select" @change="changeStatus">
              <ElOption v-for="s in statusOptions" :key="s" :value="s" :label="STATUS_META[s].label" />
            </ElSelect>
          </div>

          <h3 class="sub-title">Follow-up belgilash</h3>
          <div class="fu-row">
            <ElDatePicker v-model="fuDate" type="datetime" placeholder="Sana va vaqt" format="DD.MM.YYYY HH:mm" class="fu-date" />
            <ElInput v-model="fuNote" placeholder="Izoh (ixtiyoriy)" class="fu-note" />
            <button class="act-btn" @click="setFollowUp"><Icon name="clock" :size="15" /> Belgilash</button>
          </div>
          <p v-if="lead.nextFollowUpAt" class="next-fu">
            <Icon name="clock" :size="13" /> Keyingi follow-up: <b>{{ relativeTime(lead.nextFollowUpAt) }}</b>
          </p>
        </section>

        <section class="app-card block">
          <h2 class="sec-title"><Icon name="message" :size="16" /> Izohlar</h2>
          <div class="note-input">
            <ElInput v-model="noteText" type="textarea" :rows="2" placeholder="Izoh qo'shish…" />
            <button class="act-btn primary self-end" @click="addNote"><Icon name="plus" :size="15" /> Qo'shish</button>
          </div>
          <div v-if="!notes.length" class="muted">Hozircha izoh yo'q</div>
          <ul v-else class="notes">
            <li v-for="n in notes" :key="n.id" class="note">
              <div class="note-top">
                <span class="note-author"><Icon name="user" :size="12" /> {{ n.operatorName ?? "Operator" }}</span>
                <ElPopconfirm title="O'chirilsinmi?" @confirm="removeNote(n.id)">
                  <template #reference><button class="del"><Icon name="trash" :size="13" /></button></template>
                </ElPopconfirm>
              </div>
              <p class="note-text">{{ n.text }}</p>
              <span class="note-time">{{ relativeTime(n.createdAt) }}</span>
            </li>
          </ul>
        </section>
      </div>

      <!-- Right: timeline -->
      <section class="app-card block timeline-card">
        <h2 class="sec-title"><Icon name="activity" :size="16" /> Faollik tarixi</h2>
        <div v-if="!timeline.length" class="muted">Tarix bo'sh</div>
        <ul v-else class="timeline">
          <li v-for="a in timeline" :key="a.id" class="tl-item">
            <span class="tl-dot"><Icon :name="ACTIVITY_ICON[a.type] ?? 'activity'" :size="12" /></span>
            <div class="min-w-0">
              <div class="tl-desc">{{ a.description }}</div>
              <div class="tl-meta">
                {{ relativeTime(a.createdAt) }}<template v-if="a.actorName"> · {{ a.actorName }}</template>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.back {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  font-size: 13px; font-weight: 600; color: var(--text-muted);
  padding: 6px 10px; border-radius: 9px; transition: all 0.15s ease;
}
.back:hover { color: var(--text); background: var(--surface-2); }
.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 18px;
  align-items: start;
}
.col-left { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.profile { padding: 20px; }
.profile-head { display: flex; align-items: flex-start; gap: 16px; }
.avatar-lg {
  width: 58px; height: 58px; border-radius: 18px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px;
}
.name { font-size: 20px; font-weight: 800; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.contacts { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 4px; }
.contacts span { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text-muted); }
.badges { margin-top: 8px; }
.status-badge, .temp-lg {
  display: inline-flex; align-items: center; gap: 5px;
  font-weight: 700; border-radius: 999px;
}
.status-badge { font-size: 12px; padding: 4px 11px; }
.temp-lg { font-size: 14px; padding: 7px 13px; flex-shrink: 0; }
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; margin-top: 18px; }
.info {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--surface-2); border-radius: 11px; padding: 10px 13px; font-size: 13px;
}
.info span { color: var(--text-faint); }
.info b { color: var(--text); }
.won-box {
  display: flex; align-items: center; gap: 10px; margin-top: 16px;
  background: var(--success-soft); color: var(--success);
  border-radius: 13px; padding: 13px 15px; font-size: 13.5px;
}
.won-box b { font-weight: 700; }
.pay-kind {
  display: inline-flex; align-items: center; gap: 4px;
  margin-left: 8px; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600;
}
.pay-kind.card { background: var(--info-soft); color: var(--info); }
.pay-kind.platform { background: var(--warning-soft); color: var(--warning); }
.pay-kind.promo { background: rgba(147,51,234,0.12); color: #9333ea; }
.block { padding: 20px; }
.hl-metric {
  display: flex; align-items: center; gap: 12px;
  background: var(--brand-soft); border: 1px solid var(--brand);
  border-radius: 13px; padding: 13px 15px; margin-bottom: 12px;
}
.hl-metric.won { background: var(--success-soft); border-color: var(--success); }
.hl-icon {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface); color: var(--brand-strong);
}
.hl-metric.won .hl-icon { color: var(--success); }
.hl-label { font-size: 12px; color: var(--text-muted); }
.hl-value { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.hl-tag {
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
  font-size: 11.5px; font-weight: 700; color: var(--success);
  background: var(--surface); border-radius: 999px; padding: 5px 10px;
}
.eng-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
.eng {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: var(--surface-2); border-radius: 11px; padding: 12px 8px; text-align: center;
}
.eng-ic { color: var(--brand-strong); margin-bottom: 2px; }
.eng b { font-size: 18px; font-weight: 800; color: var(--text); line-height: 1; }
.eng small { font-size: 11px; color: var(--text-faint); }
.sec-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 16px;
}
.sec-title :deep(.crm-icon) { color: var(--brand-strong); }
.sub-title { font-size: 12.5px; font-weight: 700; color: var(--text-muted); margin: 4px 0 9px; }
.actions-row { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 16px; }
.status-select { width: 180px; }
.fu-row { display: flex; flex-wrap: wrap; gap: 9px; }
.fu-date { width: 210px; }
.fu-note { width: 200px; flex: 1; min-width: 160px; }
.act-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 40px; padding: 0 16px; border-radius: 11px;
  font-size: 13px; font-weight: 600; color: var(--text);
  background: var(--surface-2); border: 1px solid var(--border);
  transition: all 0.15s ease; white-space: nowrap;
}
.act-btn:hover { border-color: var(--brand); }
.act-btn.primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.act-btn.primary:hover { filter: brightness(0.95); }
.next-fu { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-muted); margin-top: 10px; }
.note-input { display: flex; gap: 9px; margin-bottom: 14px; }
.notes { display: flex; flex-direction: column; gap: 9px; }
.note { background: var(--surface-2); border-radius: 12px; padding: 11px 13px; }
.note-top { display: flex; align-items: center; justify-content: space-between; }
.note-author { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--text-muted); }
.del { color: var(--text-faint); transition: color 0.15s ease; }
.del:hover { color: var(--danger); }
.note-text { font-size: 13px; color: var(--text); margin-top: 5px; }
.note-time { font-size: 11px; color: var(--text-faint); }
.muted { color: var(--text-faint); font-size: 13px; padding: 8px 0; }
.timeline-card { position: sticky; top: 16px; }
.timeline { display: flex; flex-direction: column; }
.tl-item { display: flex; gap: 12px; padding: 0 0 18px 0; position: relative; }
.tl-item::before {
  content: ""; position: absolute; left: 12px; top: 26px; bottom: -2px;
  width: 2px; background: var(--border);
}
.tl-item:last-child { padding-bottom: 0; }
.tl-item:last-child::before { display: none; }
.tl-dot {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; z-index: 1;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--brand-soft); color: var(--brand-strong);
}
.tl-desc { font-size: 13px; font-weight: 600; color: var(--text); }
.tl-meta { font-size: 11.5px; color: var(--text-faint); margin-top: 2px; }

@media (max-width: 920px) {
  .detail-grid { grid-template-columns: 1fr; }
  .timeline-card { position: static; }
}
@media (max-width: 600px) {
  .info-grid { grid-template-columns: 1fr; }
  .eng-grid { grid-template-columns: repeat(2, 1fr); }
  .hl-tag { display: none; }
  .name { font-size: 18px; }
  .status-select, .fu-date, .fu-note { width: 100%; }
}
</style>
