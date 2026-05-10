<script setup lang="ts">
import {
  ElButton,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTag,
} from "element-plus";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Card from "../../components/ui/Card.vue";
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

const priorityTagType = (p: LeadPriority) => {
  switch (p) {
    case "High":
      return "danger";
    case "Medium":
      return "warning";
    case "Low":
      return "info";
    case "Closed":
      return "";
  }
};

const priorityLabel = (p: LeadPriority) => {
  switch (p) {
    case "High":
      return "Yuqori";
    case "Medium":
      return "O'rta";
    case "Low":
      return "Past";
    case "Closed":
      return "Yopilgan";
  }
};

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
  try {
    await ElMessageBox.confirm("Izohni o'chirishni xohlaysizmi?", "Tasdiqlash", {
      confirmButtonText: "Ha",
      cancelButtonText: "Yo'q",
      type: "warning",
    });
  } catch {
    return;
  }
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
  <div class="flex flex-col gap-4">
    <Card>
      <template #title>
        <div class="flex justify-between items-center mb-3">
          <h2 class="font-semibold text-[24px]">Lead #{{ leadId }}</h2>
          <ElButton @click="router.back()">← Orqaga</ElButton>
        </div>
      </template>

      <div v-if="lead" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Foydalanuvchi</span>
          <span class="font-medium">{{ lead.userName ?? "—" }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">User ID</span>
          <span class="font-medium">{{ lead.userId }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Email</span>
          <CopyText v-if="lead.userEmail" :text="lead.userEmail" />
          <span v-else>—</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Telefon</span>
          <CopyText v-if="lead.userPhone" :text="lead.userPhone" />
          <span v-else>—</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Ro'yxatdan o'tgan</span>
          <div>
            <ElTag :type="lead.isRegistered ? 'success' : 'info'" size="small">
              {{ lead.isRegistered ? "Ha" : "Yo'q" }}
            </ElTag>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Sotib olgan</span>
          <div>
            <ElTag :type="lead.purchased ? 'success' : 'info'" size="small">
              {{ lead.purchased ? "Ha" : "Yo'q" }}
            </ElTag>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Obuna ko'rishlar</span>
          <span class="font-medium">{{ lead.subscriptionOpenedCount }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Prioritet</span>
          <div>
            <ElTag :type="priorityTagType(lead.priority) as any" size="small">
              {{ priorityLabel(lead.priority) }}
            </ElTag>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-gray-500">Oxirgi faollik</span>
          <span>{{ formatDate(lead.lastActivity) }}</span>
        </div>
      </div>
    </Card>

    <Card title="Izohlar">
      <div class="flex flex-col gap-2 mb-4">
        <ElInput
          v-model="noteText"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          :placeholder="
            editingNoteId ? 'Izohni tahrirlash...' : 'Yangi izoh...'
          "
        />
        <div class="flex gap-2 self-end">
          <ElButton v-if="editingNoteId" @click="reset">Bekor qilish</ElButton>
          <ElButton
            type="primary"
            :loading="submitting"
            :disabled="!noteText.trim()"
            @click="handleSubmit"
          >
            {{ editingNoteId ? "Yangilash" : "Qo'shish" }}
          </ElButton>
        </div>
      </div>

      <div v-if="notes.length === 0" class="text-gray-400 text-sm py-4 text-center">
        Izohlar yo'q
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="note in notes"
          :key="note.id"
          class="border border-gray-200 rounded-lg p-3 flex flex-col gap-2"
          :class="{
            'border-blue-400 bg-blue-50': editingNoteId === note.id,
          }"
        >
          <div class="flex justify-between items-start gap-3">
            <div class="text-sm text-gray-500">
              <span class="font-medium text-gray-700">{{
                note.operatorName ?? "—"
              }}</span>
              <span class="ml-2">{{ formatDate(note.createdAt) }}</span>
            </div>
            <div class="flex gap-1">
              <ElButton size="small" @click="startEdit(note)">Tahrirlash</ElButton>
              <ElButton size="small" type="danger" @click="handleDelete(note)">
                O'chirish
              </ElButton>
            </div>
          </div>
          <p class="text-sm whitespace-pre-wrap break-words">{{ note.text }}</p>
        </div>
      </div>
    </Card>
  </div>
</template>
