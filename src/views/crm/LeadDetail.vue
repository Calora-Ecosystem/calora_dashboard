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
</script>

<template>
  <div v-if="lead" class="flex flex-col gap-5">
    <button class="back" @click="router.back()">← Orqaga</button>

    <div class="grid gap-5" style="grid-template-columns: minmax(300px, 1.1fr) minmax(280px, 1fr)">
      <!-- Left: profile + actions -->
      <div class="flex flex-col gap-5">
        <section class="app-card p-5">
          <div class="flex items-center gap-4">
            <div class="avatar-lg" :style="{ background: `hsl(${avatarHue(lead.id)} 70% 92%)`, color: `hsl(${avatarHue(lead.id)} 65% 38%)` }">
              {{ initials(lead.userName) }}
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-[20px] font-extrabold truncate" style="color: var(--text)">{{ lead.userName ?? "Noma'lum" }}</h1>
              <div class="text-[13px]" style="color: var(--text-muted)">{{ lead.userPhone ?? "—" }} · {{ lead.userEmail ?? "—" }}</div>
            </div>
            <span v-if="tempMeta" class="temp-lg" :style="{ background: tempMeta.soft, color: tempMeta.color }">
              {{ tempMeta.emoji }} {{ lead.score }}
            </span>
          </div>

          <div class="info-grid mt-4">
            <div class="info"><span>Yosh</span><b>{{ lead.age ?? "—" }}</b></div>
            <div class="info"><span>Jinsi</span><b>{{ lead.gender ?? "—" }}</b></div>
            <div class="info"><span>Vazn</span><b>{{ lead.weight ? lead.weight + " kg" : "—" }}</b></div>
            <div class="info"><span>Bo'y</span><b>{{ lead.height ? lead.height + " sm" : "—" }}</b></div>
            <div class="info"><span>Maqsad</span><b>{{ lead.purpose ? (purposeLabels[lead.purpose] ?? lead.purpose) : "—" }}</b></div>
            <div class="info"><span>Obuna ko'rdi</span><b>👁 {{ lead.subscriptionOpenedCount }}</b></div>
            <div class="info"><span>Ro'yxatdan</span><b>{{ relativeTime(lead.createdAt) }}</b></div>
            <div class="info"><span>Oxirgi faollik</span><b>{{ relativeTime(lead.lastActivity) }}</b></div>
          </div>

          <div v-if="lead.status === 'Won'" class="won-box mt-4">
            ✅ Sotuv yakunlandi —
            <b>{{ formatMoney(lead.wonAmount ?? 0) }}</b>
            <template v-if="lead.paymentProvider">
              · {{ PAYMENT_META[lead.paymentProvider].label }}
              <span class="pay-kind" :class="PAYMENT_META[lead.paymentProvider].kind">
                {{ PAYMENT_META[lead.paymentProvider].kind === 'card' ? '💳 Karta' : '📱 Platforma' }}
              </span>
            </template>
          </div>
        </section>

        <section class="app-card p-5">
          <h2 class="sec-title">Harakatlar</h2>
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <button class="act-btn primary" @click="contact">📞 Bog'lanildi</button>
            <ElSelect
              :model-value="lead.status"
              placeholder="Holat"
              style="width: 170px"
              @change="changeStatus"
            >
              <ElOption v-for="s in LEAD_STATUSES" :key="s" :value="s" :label="STATUS_META[s].label" />
            </ElSelect>
          </div>

          <h3 class="sub-title">Follow-up belgilash</h3>
          <div class="flex flex-wrap items-center gap-2">
            <ElDatePicker
              v-model="fuDate"
              type="datetime"
              placeholder="Sana va vaqt"
              format="DD.MM.YYYY HH:mm"
              style="width: 200px"
            />
            <ElInput v-model="fuNote" placeholder="Izoh (ixtiyoriy)" style="width: 200px" />
            <button class="act-btn" @click="setFollowUp">⏰ Belgilash</button>
          </div>
          <p v-if="lead.nextFollowUpAt" class="text-[12px] mt-2" style="color: var(--text-muted)">
            Keyingi follow-up: <b>{{ relativeTime(lead.nextFollowUpAt) }}</b>
          </p>
        </section>

        <section class="app-card p-5">
          <h2 class="sec-title">Izohlar</h2>
          <div class="flex gap-2 mb-3">
            <ElInput v-model="noteText" type="textarea" :rows="2" placeholder="Izoh qo'shish…" />
            <button class="act-btn primary self-end" @click="addNote">Qo'shish</button>
          </div>
          <div v-if="!notes.length" class="muted">Hozircha izoh yo'q</div>
          <ul v-else class="flex flex-col gap-2">
            <li v-for="n in notes" :key="n.id" class="note">
              <div class="flex items-center justify-between">
                <span class="text-[12px] font-semibold" style="color: var(--text-muted)">{{ n.operatorName ?? "Operator" }}</span>
                <ElPopconfirm title="O'chirilsinmi?" @confirm="removeNote(n.id)">
                  <template #reference><button class="del">✕</button></template>
                </ElPopconfirm>
              </div>
              <p class="text-[13px] mt-1" style="color: var(--text)">{{ n.text }}</p>
              <span class="text-[11px]" style="color: var(--text-faint)">{{ relativeTime(n.createdAt) }}</span>
            </li>
          </ul>
        </section>
      </div>

      <!-- Right: timeline -->
      <section class="app-card p-5 self-start">
        <h2 class="sec-title">Faollik tarixi</h2>
        <div v-if="!timeline.length" class="muted">Tarix bo'sh</div>
        <ul v-else class="timeline">
          <li v-for="a in timeline" :key="a.id" class="tl-item">
            <span class="tl-dot" />
            <div class="min-w-0">
              <div class="text-[13px] font-semibold" style="color: var(--text)">{{ a.description }}</div>
              <div class="text-[11.5px]" style="color: var(--text-faint)">
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
.back {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  align-self: flex-start;
}
.avatar-lg {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 22px;
  flex-shrink: 0;
}
.temp-lg {
  font-size: 14px;
  font-weight: 800;
  padding: 6px 12px;
  border-radius: 999px;
  white-space: nowrap;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px;
}
.info {
  display: flex;
  justify-content: space-between;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
}
.info span { color: var(--text-faint); }
.info b { color: var(--text); }
.won-box {
  background: var(--success-soft);
  color: var(--success);
  border-radius: 11px;
  padding: 11px 14px;
  font-size: 13.5px;
  font-weight: 600;
}
.pay-kind {
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11.5px;
}
.pay-kind.card { background: var(--info-soft); color: var(--info); }
.pay-kind.platform { background: var(--warning-soft); color: var(--warning); }
.sec-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 14px;
}
.sub-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.act-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.act-btn.primary {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
}
.note {
  background: var(--surface-2);
  border-radius: 11px;
  padding: 10px 12px;
}
.del { color: var(--text-faint); font-size: 12px; }
.muted { color: var(--text-faint); font-size: 13px; padding: 8px 0; }
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}
.tl-item {
  display: flex;
  gap: 12px;
  padding: 0 0 18px 4px;
  position: relative;
}
.tl-item::before {
  content: "";
  position: absolute;
  left: 8px;
  top: 16px;
  bottom: 0;
  width: 2px;
  background: var(--border);
}
.tl-item:last-child::before { display: none; }
.tl-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--brand);
  margin-top: 4px;
  flex-shrink: 0;
  z-index: 1;
  box-shadow: 0 0 0 3px var(--brand-soft);
}
</style>
