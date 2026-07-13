<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import Icon from "./components/Icon.vue";
import {
  useCrmStore,
  type LeadDto,
  type LeadStatus,
} from "../../stores/crmStore";
import {
  KANBAN_STATUSES,
  STATUS_META,
  TEMP_META,
  canMoveLead,
  initials,
  avatarHue,
  dueLabel,
} from "./crmMeta";

const crmStore = useCrmStore();
const router = useRouter();

const columns = reactive<Record<LeadStatus, LeadDto[]>>(
  Object.fromEntries(KANBAN_STATUSES.map((s) => [s, []])) as Record<LeadStatus, LeadDto[]>,
);
const loading = ref(false);
const search = ref("");
const dragId = ref<number | null>(null);
const dragFrom = ref<LeadStatus | null>(null);
const dragOver = ref<LeadStatus | null>(null);

// Ustuvorlik tartibi: High > Medium > Low > Closed.
const PRIORITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1, Closed: 0 };

// priority → qiziqish (obuna sahifasini ochishlar soni) → ball → oxirgi faollik.
const sortLeads = (leads: LeadDto[]): LeadDto[] =>
  [...leads].sort((a, b) => {
    const p = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
    if (p !== 0) return p;
    const v = (b.subscriptionOpenedCount ?? 0) - (a.subscriptionOpenedCount ?? 0);
    if (v !== 0) return v;
    const s = (b.score ?? 0) - (a.score ?? 0);
    if (s !== 0) return s;
    return +new Date(b.lastActivity) - +new Date(a.lastActivity);
  });

const loadColumn = async (status: LeadStatus) => {
  const res = await crmStore.loadLeads({
    skip: 0,
    take: 100,
    status,
    search: search.value || undefined,
    // Tartib backendda: priority → qiziqish (obuna ochishlar) → ball.
  });
  columns[status] = sortLeads(res.content ?? []);
};

const loadAll = async () => {
  loading.value = true;
  try {
    await Promise.all(KANBAN_STATUSES.map(loadColumn));
  } finally {
    loading.value = false;
  }
};

onMounted(loadAll);

const onDragStart = (lead: LeadDto, from: LeadStatus) => {
  dragId.value = lead.id;
  dragFrom.value = from;
};

const onDrop = async (to: LeadStatus) => {
  dragOver.value = null;
  const id = dragId.value;
  const from = dragFrom.value;
  dragId.value = null;
  dragFrom.value = null;
  if (id == null || from == null || from === to) return;

  // Pipeline gate: "Yangi" leadni faqat "Bog'lanish"ga o'tkazish mumkin.
  if (!canMoveLead(from, to)) {
    ElMessage.warning(`Avval leadni "${STATUS_META.Contacted.label}"ga o'tkazing`);
    return;
  }

  const idx = columns[from].findIndex((l) => l.id === id);
  if (idx === -1) return;
  const lead = columns[from][idx];

  let reason: string | undefined;
  if (to === "Lost") {
    try {
      const { value } = await ElMessageBox.prompt(
        "Yo'qotish sababini kiriting",
        "Lead yo'qotildi",
        { confirmButtonText: "Saqlash", cancelButtonText: "Bekor", inputPattern: /.+/, inputErrorMessage: "Sabab majburiy" },
      );
      reason = value;
    } catch {
      return;
    }
  }

  columns[from].splice(idx, 1);
  lead.status = to;
  columns[to].unshift(lead);

  try {
    await crmStore.moveStatus(id, to, reason);
    ElMessage.success(`"${lead.userName ?? "Lead"}" → ${STATUS_META[to].label}`);
    if (to === "Won" || to === "Lost") await loadColumn(to);
  } catch {
    // Revert; the API layer already shows the reason (e.g. "user hasn't purchased").
    columns[to] = columns[to].filter((l) => l.id !== id);
    lead.status = from;
    columns[from].splice(idx, 0, lead);
  }
};

const openLead = (id: number) => router.push({ name: "crm_lead_detail", params: { leadId: id } });

const isPremiumHot = (l: LeadDto) =>
  !l.purchased && l.subscriptionOpenedCount > 0 && l.status !== "Won" && l.status !== "Lost";
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title"><Icon name="columns" :size="22" /> Lead Funnel</h1>
        <p class="page-sub">Drag &amp; drop orqali leadlarni boshqaring</p>
      </div>
      <div class="tools">
        <div class="search">
          <Icon name="search" :size="16" />
          <input v-model="search" placeholder="Ism, telefon yoki email…" @keyup.enter="loadAll" />
        </div>
        <button class="icon-btn" :class="{ spin: loading }" title="Yangilash" @click="loadAll">
          <Icon name="refresh" :size="17" />
        </button>
      </div>
    </header>

    <div class="board">
      <section
        v-for="status in KANBAN_STATUSES"
        :key="status"
        class="col"
        :class="{ 'col-over': dragOver === status }"
        @dragover.prevent="dragOver = status"
        @dragleave="dragOver === status && (dragOver = null)"
        @drop="onDrop(status)"
      >
        <div class="col-head">
          <span class="col-chip" :style="{ background: STATUS_META[status].soft, color: STATUS_META[status].color }">
            <Icon :name="STATUS_META[status].icon" :size="14" />
          </span>
          <span class="col-title">{{ STATUS_META[status].label }}</span>
          <span class="col-count">{{ columns[status].length }}</span>
        </div>
        <div class="col-rule" :style="{ background: STATUS_META[status].color }" />

        <div class="col-body">
          <article
            v-for="lead in columns[status]"
            :key="lead.id"
            class="lead"
            :class="{ hot: isPremiumHot(lead) }"
            draggable="true"
            @dragstart="onDragStart(lead, status)"
            @click="openLead(lead.id)"
          >
            <span class="grip"><Icon name="grip" :size="16" /></span>
            <div class="lead-top">
              <div class="avatar" :style="{ background: `hsl(${avatarHue(lead.id)} 70% 92%)`, color: `hsl(${avatarHue(lead.id)} 65% 38%)` }">
                {{ initials(lead.userName) }}
              </div>
              <div class="min-w-0 grow">
                <div class="lead-name">{{ lead.userName ?? "Noma'lum" }}</div>
                <div class="lead-sub">{{ lead.userPhone ?? lead.userEmail ?? "—" }}</div>
              </div>
              <span class="temp" :style="{ background: TEMP_META[lead.temperature].soft, color: TEMP_META[lead.temperature].color }">
                <Icon :name="TEMP_META[lead.temperature].icon" :size="12" /> {{ lead.score }}
              </span>
            </div>

            <div v-if="isPremiumHot(lead) || lead.nextFollowUpAt" class="lead-tags">
              <span v-if="isPremiumHot(lead)" class="tag tag-hot">
                <Icon name="eye" :size="11" /> {{ lead.subscriptionOpenedCount }} marta ko'rdi
              </span>
              <span v-if="lead.followUpOverdue" class="tag tag-od">
                <Icon name="alert-triangle" :size="11" /> Kechikkan
              </span>
              <span v-else-if="lead.nextFollowUpAt" class="tag tag-fu">
                <Icon name="clock" :size="11" /> {{ dueLabel(lead.nextFollowUpAt) }}
              </span>
            </div>
          </article>

          <div v-if="!columns[status].length" class="col-empty">Bo'sh</div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.page-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
}
.page-title {
  display: flex; align-items: center; gap: 9px;
  font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px;
}
.page-title :deep(.crm-icon) { color: var(--brand-strong); }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.tools { display: flex; align-items: center; gap: 9px; }
.search {
  display: flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 13px; border-radius: 11px;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text-faint); transition: border-color 0.15s ease;
}
.search:focus-within { border-color: var(--brand); }
.search input {
  width: 230px; max-width: 52vw; background: transparent; border: none; outline: none;
  font-size: 13px; color: var(--text);
}
.icon-btn {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);
  transition: all 0.15s ease;
}
.icon-btn:hover { color: var(--brand-strong); border-color: var(--brand); }
.icon-btn.spin :deep(.crm-icon) { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.board {
  display: flex; gap: 14px; overflow-x: auto;
  padding-bottom: 10px; align-items: flex-start;
  scrollbar-width: thin;
}
.col {
  flex: 0 0 272px; width: 272px;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 16px; display: flex; flex-direction: column;
  max-height: calc(100vh - 210px);
}
.col-over { outline: 2px dashed var(--brand); outline-offset: -2px; background: var(--brand-soft); }
.col-head {
  display: flex; align-items: center; gap: 9px; padding: 13px 14px 9px;
}
.col-chip {
  width: 26px; height: 26px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.col-title { font-size: 13px; font-weight: 700; color: var(--text); flex: 1; }
.col-count {
  font-size: 12px; font-weight: 700; color: var(--text-muted);
  background: var(--surface); border-radius: 999px; padding: 1px 9px;
}
.col-rule { height: 3px; margin: 0 14px; border-radius: 999px; opacity: 0.85; }
.col-body {
  padding: 11px; display: flex; flex-direction: column; gap: 9px;
  overflow-y: auto; scrollbar-width: thin;
}
.lead {
  position: relative;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 13px; padding: 12px 12px 12px 26px;
  cursor: grab; transition: box-shadow 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
}
.lead:hover { box-shadow: var(--shadow-sm); transform: translateY(-1px); border-color: color-mix(in srgb, var(--brand) 40%, var(--border)); }
.lead:active { cursor: grabbing; }
.lead.hot { border-color: var(--danger); box-shadow: 0 0 0 1px var(--danger) inset; }
.grip {
  position: absolute; left: 4px; top: 50%; transform: translateY(-50%);
  color: var(--text-faint); opacity: 0.5;
}
.lead:hover .grip { opacity: 0.9; }
.lead-top { display: flex; align-items: center; gap: 9px; }
.avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;
}
.lead-name { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lead-sub { font-size: 11.5px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.temp {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 700; padding: 3px 7px;
  border-radius: 999px; white-space: nowrap; flex-shrink: 0;
}
.lead-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
}
.tag-hot, .tag-od { background: var(--danger-soft); color: var(--danger); }
.tag-fu { background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border); }
.col-empty { text-align: center; font-size: 12px; color: var(--text-faint); padding: 18px 0; }

@media (max-width: 600px) {
  .page-title { font-size: 19px; }
  .search input { width: 150px; }
  .col { flex-basis: 248px; width: 248px; }
}
</style>
