<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  useCrmStore,
  type LeadDto,
  type LeadStatus,
} from "../../stores/crmStore";
import {
  KANBAN_STATUSES,
  STATUS_META,
  TEMP_META,
  initials,
  avatarHue,
  dueLabel,
} from "./crmMeta";

const crmStore = useCrmStore();
const router = useRouter();

const columns = reactive<Record<LeadStatus, LeadDto[]>>({
  New: [], Assigned: [], Contacted: [], Interested: [], FollowUp: [], Won: [], Lost: [],
});
const loading = ref(false);
const search = ref("");
const dragId = ref<number | null>(null);
const dragFrom = ref<LeadStatus | null>(null);
const dragOver = ref<LeadStatus | null>(null);

const loadColumn = async (status: LeadStatus) => {
  const res = await crmStore.loadLeads({
    skip: 0,
    take: 100,
    status,
    search: search.value || undefined,
    sortPropName: "score",
    sortDirection: "Descending",
  });
  columns[status] = res.content ?? [];
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
      return; // cancelled
    }
  }

  // optimistic move
  columns[from].splice(idx, 1);
  lead.status = to;
  columns[to].unshift(lead);

  try {
    await crmStore.moveStatus(id, to, reason);
    ElMessage.success(`"${lead.userName ?? "Lead"}" → ${STATUS_META[to].label}`);
    if (to === "Won" || to === "Lost") await loadColumn(to);
  } catch {
    // revert on failure
    columns[to] = columns[to].filter((l) => l.id !== id);
    lead.status = from;
    columns[from].splice(idx, 0, lead);
    ElMessage.error("Holatni o'zgartirib bo'lmadi");
  }
};

const openLead = (id: number) => router.push({ name: "crm_lead_detail", params: { leadId: id } });

const isPremiumHot = (l: LeadDto) =>
  !l.purchased && l.subscriptionOpenedCount > 0 && l.status !== "Won" && l.status !== "Lost";
</script>

<template>
  <div class="flex flex-col gap-4 min-h-0">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-[22px] font-extrabold" style="color: var(--text)">Lead Funnel</h1>
        <p class="text-[13px]" style="color: var(--text-faint)">Drag &amp; drop orqali leadlarni boshqaring</p>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="search"
          class="search"
          placeholder="Qidirish (ism, telefon, email)…"
          @keyup.enter="loadAll"
        />
        <button class="refresh" :disabled="loading" @click="loadAll">↻</button>
      </div>
    </div>

    <div class="board">
      <div
        v-for="status in KANBAN_STATUSES"
        :key="status"
        class="col"
        :class="{ 'col-over': dragOver === status }"
        @dragover.prevent="dragOver = status"
        @dragleave="dragOver === status && (dragOver = null)"
        @drop="onDrop(status)"
      >
        <div class="col-head" :style="{ borderColor: STATUS_META[status].color }">
          <span class="col-dot" :style="{ background: STATUS_META[status].color }" />
          <span class="col-title">{{ STATUS_META[status].label }}</span>
          <span class="col-count">{{ columns[status].length }}</span>
        </div>

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
            <div class="lead-top">
              <div class="avatar" :style="{ background: `hsl(${avatarHue(lead.id)} 70% 92%)`, color: `hsl(${avatarHue(lead.id)} 65% 38%)` }">
                {{ initials(lead.userName) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="lead-name">{{ lead.userName ?? "Noma'lum" }}</div>
                <div class="lead-sub">{{ lead.userPhone ?? lead.userEmail ?? "—" }}</div>
              </div>
              <span class="temp" :style="{ background: TEMP_META[lead.temperature].soft, color: TEMP_META[lead.temperature].color }">
                {{ TEMP_META[lead.temperature].emoji }} {{ lead.score }}
              </span>
            </div>

            <div class="lead-tags">
              <span v-if="isPremiumHot(lead)" class="tag tag-hot">👁 {{ lead.subscriptionOpenedCount }} marta ko'rdi</span>
              <span v-if="lead.followUpOverdue" class="tag tag-od">⏰ Kechikkan</span>
              <span v-else-if="lead.nextFollowUpAt" class="tag tag-fu">⏰ {{ dueLabel(lead.nextFollowUpAt) }}</span>
            </div>
          </article>

          <div v-if="!columns[status].length" class="col-empty">Bo'sh</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search {
  height: 38px;
  width: 280px;
  max-width: 60vw;
  padding: 0 14px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 13px;
}
.refresh {
  height: 38px;
  width: 38px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 16px;
}
.board {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 8px;
  align-items: flex-start;
}
.col {
  flex: 0 0 270px;
  width: 270px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}
.col-over {
  outline: 2px dashed var(--brand);
  outline-offset: -2px;
}
.col-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 2px solid;
}
.col-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.col-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  flex: 1;
}
.col-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--surface);
  border-radius: 999px;
  padding: 1px 9px;
}
.col-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow-y: auto;
}
.lead {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 11px;
  cursor: grab;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}
.lead:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}
.lead:active {
  cursor: grabbing;
}
.lead.hot {
  border-color: var(--danger);
  box-shadow: 0 0 0 1px var(--danger) inset;
}
.lead-top {
  display: flex;
  align-items: center;
  gap: 9px;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.lead-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lead-sub {
  font-size: 11.5px;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.temp {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}
.lead-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}
.tag {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.tag-hot { background: var(--danger-soft); color: var(--danger); }
.tag-od { background: var(--danger-soft); color: var(--danger); }
.tag-fu { background: var(--surface-2); color: var(--text-muted); }
.col-empty {
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
  padding: 16px 0;
}
</style>
