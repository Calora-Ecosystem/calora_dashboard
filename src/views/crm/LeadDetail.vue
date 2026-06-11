<script setup lang="ts">
import { ElInput, ElMessage, ElMessageBox, ElPopconfirm } from "element-plus";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import CopyText from "../../components/shared/CopyText.vue";
import {
  useCrmStore,
  type LeadDetailDto,
  type LeadPriority,
  type NoteDto,
} from "../../stores/crmStore";
import { formatDate } from "../../utils/FormatHelper";

const crmStore = useCrmStore();
const route = useRoute();
const router = useRouter();

const leadId = computed(() => Number(route.params.leadId));

const lead = ref<LeadDetailDto | null>(null);
const notes = ref<NoteDto[]>([]);

const editingNoteId = ref<number | null>(null);
const noteText = ref("");
const submitting = ref(false);

const priorityStyle = (p: LeadPriority) => {
  switch (p) {
    case "High":
      return { bg: "var(--danger-soft)", color: "var(--danger)" };
    case "Medium":
      return { bg: "var(--warning-soft)", color: "var(--warning)" };
    case "Low":
      return { bg: "var(--info-soft)", color: "var(--info)" };
    case "Closed":
      return { bg: "var(--surface-2)", color: "var(--text-muted)" };
  }
};

const priorityLabel = (p: LeadPriority) => {
  switch (p) {
    case "High": return "Yuqori";
    case "Medium": return "O'rta";
    case "Low": return "Past";
    case "Closed": return "Yopilgan";
  }
};

const initials = (name: string | null) => (name?.trim()?.[0] ?? "?").toUpperCase();

const loadLead = async () => {
  const res = await crmStore.getLeadById(leadId.value);
  if (res.code === 200) lead.value = res.content;
};
const loadNotes = async () => {
  const res = await crmStore.getLeadNotes(leadId.value);
  if (res.code === 200) notes.value = res.content ?? [];
};

const reset = () => {
  editingNoteId.value = null;
  noteText.value = "";
};
const startEdit = (note: NoteDto) => {
  editingNoteId.value = note.id;
  noteText.value = note.text ?? "";
};

const handleSubmit = async () => {
  const text = noteText.value.trim();
  if (!text) {
    ElMessage.warning("Matn bo'sh bo'lmasin");
    return;
  }
  if (text.length > 500) {
    ElMessage.warning("Matn 500 ta belgidan oshmasin");
    return;
  }
  submitting.value = true;
  try {
    const res = await crmStore.upsertLeadNote(leadId.value, {
      id: editingNoteId.value ?? undefined,
      text,
    });
    if (res.code === 200) {
      ElMessage.success(editingNoteId.value ? "Yangilandi" : "Qo'shildi");
      reset();
      await loadNotes();
    } else {
      ElMessage.error(res.error ?? "Xatolik");
    }
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (note: NoteDto) => {
  const res = await crmStore.deleteNote(note.id);
  if (res.code === 200) {
    ElMessage.success("O'chirildi");
    if (editingNoteId.value === note.id) reset();
    await loadNotes();
  } else {
    ElMessage.error(res.error ?? "Xatolik");
  }
};

onMounted(async () => {
  await Promise.all([loadLead(), loadNotes()]);
});
</script>

<template>
  <div>
    <!-- Sticky header -->
    <div class="form-header">
      <div class="flex items-center gap-3 min-w-0">
        <button type="button" class="hbtn-back" @click="router.back()">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="min-w-0">
          <h1 class="text-[19px] font-bold truncate" style="color: var(--text)">
            {{ lead?.userName ?? `Lead #${leadId}` }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Lead #{{ leadId }} · mijoz kartasi</p>
        </div>
      </div>
      <span v-if="lead" class="badge" :style="{ background: priorityStyle(lead.priority).bg, color: priorityStyle(lead.priority).color }">
        {{ priorityLabel(lead.priority) }}
      </span>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
      <!-- LEFT: contact + stats -->
      <div class="space-y-5 min-w-0">
        <section class="panel" v-if="lead">
          <div class="flex items-center gap-3">
            <div class="avatar-lg">{{ initials(lead.userName) }}</div>
            <div class="min-w-0">
              <h2 class="text-[16px] font-bold truncate" style="color: var(--text)">{{ lead.userName ?? "Noma'lum" }}</h2>
              <p class="text-[12px]" style="color: var(--text-faint)">User ID: {{ lead.userId }}</p>
            </div>
          </div>

          <div class="mt-4 space-y-2.5">
            <div class="contact-row">
              <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <CopyText v-if="lead.userEmail" :text="lead.userEmail" class="text-[13px]" style="color: var(--text)" />
              <span v-else style="color: var(--text-faint)">Email yo'q</span>
            </div>
            <div class="contact-row">
              <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <CopyText v-if="lead.userPhone" :text="lead.userPhone" class="text-[13px]" style="color: var(--text)" />
              <span v-else style="color: var(--text-faint)">Telefon yo'q</span>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <a v-if="lead.userPhone" :href="`tel:${lead.userPhone}`" class="quick-btn"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Qo'ng'iroq</a>
            <a v-if="lead.userEmail" :href="`mailto:${lead.userEmail}`" class="quick-btn"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email</a>
          </div>
        </section>

        <section class="panel" v-if="lead">
          <h2 class="panel-title">Ko'rsatkichlar</h2>
          <div class="mt-4 space-y-2.5">
            <div class="stat-row">
              <span class="stat-label">Ro'yxatdan o'tgan</span>
              <span class="pill" :class="lead.isRegistered ? 'pill-on' : 'pill-off'">{{ lead.isRegistered ? "Ha" : "Yo'q" }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Sotib olgan</span>
              <span class="pill" :class="lead.purchased ? 'pill-buy' : 'pill-off'">{{ lead.purchased ? "Ha" : "Yo'q" }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Obuna ko'rishlar</span>
              <span class="font-bold" style="color: var(--text)">{{ lead.subscriptionOpenedCount }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Oxirgi faollik</span>
              <span class="text-[13px]" style="color: var(--text-muted)">{{ formatDate(lead.lastActivity) }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- RIGHT: notes / activity -->
      <div class="xl:col-span-2 min-w-0">
        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Izohlar</h2>
            <span class="count-chip">{{ notes.length }}</span>
          </div>

          <!-- Composer -->
          <div class="composer mt-4" :class="{ 'composer-edit': editingNoteId }">
            <ElInput
              v-model="noteText"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              :placeholder="editingNoteId ? 'Izohni tahrirlash...' : 'Mijoz haqida izoh yozing...'"
            />
            <div class="flex gap-2 justify-end mt-2">
              <button v-if="editingNoteId" type="button" class="ghost-btn" @click="reset">Bekor</button>
              <button
                type="button"
                class="primary-btn"
                :disabled="submitting || !noteText.trim()"
                @click="handleSubmit"
              >
                <span v-if="submitting" class="spinner"></span>
                {{ editingNoteId ? "Yangilash" : "Qo'shish" }}
              </button>
            </div>
          </div>

          <!-- Empty -->
          <div v-if="!notes.length" class="empty-box mt-4">
            Hozircha izoh yo'q. Birinchi izohni qo'shing.
          </div>

          <!-- Timeline -->
          <div v-else class="timeline mt-5">
            <div v-for="note in notes" :key="note.id" class="note" :class="{ 'note-editing': editingNoteId === note.id }">
              <div class="note-avatar">{{ initials(note.operatorName) }}</div>
              <div class="note-body">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <span class="font-semibold text-[13px]" style="color: var(--text)">{{ note.operatorName ?? "Operator" }}</span>
                    <span class="text-[11.5px] ml-2" style="color: var(--text-faint)">{{ formatDate(note.createdAt) }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button class="note-act" title="Tahrirlash" @click="startEdit(note)">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                    </button>
                    <ElPopconfirm title="Izohni o'chirasizmi?" confirm-button-text="Ha" cancel-button-text="Yo'q" @confirm="handleDelete(note)">
                      <template #reference>
                        <button class="note-act note-del" title="O'chirish">
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </template>
                    </ElPopconfirm>
                  </div>
                </div>
                <p class="mt-1.5 text-[13.5px] whitespace-pre-wrap break-words" style="color: var(--text-muted)">{{ note.text }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-header {
  position: sticky;
  top: -28px;
  z-index: 20;
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
.hbtn-back {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.hbtn-back:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.count-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: var(--brand-soft);
  color: var(--brand-strong);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 13px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
}
.avatar-lg {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 21px;
  flex-shrink: 0;
  color: var(--brand-strong);
  background: var(--brand-soft);
}
.contact-row {
  display: flex;
  align-items: center;
  gap: 9px;
}
.ic {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-faint);
}
.quick-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  transition: all 0.15s ease;
}
.quick-btn:hover {
  filter: brightness(0.96);
}
.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.pill-on { background: var(--brand-soft); color: var(--brand-strong); }
.pill-off { background: var(--surface-2); color: var(--text-faint); }
.pill-buy { background: var(--info-soft); color: var(--info); }

.composer {
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 12px;
  background: var(--surface-2);
  transition: border-color 0.15s ease;
}
.composer-edit {
  border-color: var(--brand);
}
.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  transition: all 0.15s ease;
}
.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ghost-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
}
.ghost-btn:hover {
  color: var(--text);
}
.empty-box {
  text-align: center;
  padding: 28px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  font-size: 13px;
  color: var(--text-faint);
  background: var(--surface-2);
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.note {
  display: flex;
  gap: 12px;
}
.note-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.note-body {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 11px 13px;
  background: var(--surface);
}
.note-editing .note-body {
  border-color: var(--brand);
  background: var(--brand-soft);
}
.note-act {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-faint);
  transition: all 0.15s ease;
}
.note-act:hover {
  color: var(--brand-strong);
  background: var(--surface-2);
}
.note-del:hover {
  color: var(--danger);
}
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
