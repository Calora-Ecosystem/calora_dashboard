<script setup lang="ts">
import { ElMessageBox, ElPopconfirm, ElTableColumn } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import { useReminderStore } from "../../stores/reminderStore";
import type { ReminderMessageDto } from "../../@types/reminder";

const reminderStore = useReminderStore();
const router = useRouter();
const tableKey = ref(0);

const goToEdit = (row: ReminderMessageDto) => {
  reminderStore.editingMessage = { ...row };
  router.push({ name: "reminder_message_edit", params: { messageId: row.id } });
};

const handleDelete = async (row: ReminderMessageDto) => {
  const res = await reminderStore.deleteMessage(row.id);
  if (res.code === 200) tableKey.value++;
};

const typeStyle = (type: string): { bg: string; color: string } => {
  switch (type) {
    case "Food":
      return { bg: "var(--brand-soft)", color: "var(--brand-strong)" };
    case "Water":
      return { bg: "var(--info-soft)", color: "var(--info)" };
    case "Sleep":
      return { bg: "var(--surface-2)", color: "var(--text-muted)" };
    case "DailyChallenge":
      return { bg: "var(--warning-soft)", color: "var(--warning)" };
    default:
      return { bg: "var(--surface-2)", color: "var(--text-muted)" };
  }
};
</script>

<template>
  <Card title="Eslatma xabarlari" subtitle="Push-bildirishnoma matnlari">
    <template #actions>
      <RouterLink :to="{ name: 'reminder_message_create' }">
        <button class="btn-primary">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi xabar
        </button>
      </RouterLink>
    </template>

    <DataTable :key="tableKey" :loader="reminderStore.loadMessages">
      <ElTableColumn label="ID" prop="id" width="72" />
      <ElTableColumn label="Turi" width="160">
        <template #default="{ row }">
          <span class="badge" :style="{ background: typeStyle(row.type).bg, color: typeStyle(row.type).color }">
            {{ row.type }}
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Menyu" width="130">
        <template #default="{ row }">
          <span v-if="row.menu" class="badge" style="background: var(--surface-2); color: var(--text-muted)">{{ row.menu }}</span>
          <span v-else style="color: var(--text-faint)">—</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Sarlavha" min-width="180">
        <template #default="{ row }">
          <span class="font-semibold" style="color: var(--text)">{{ row.title ?? "—" }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Tavsif" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <span style="color: var(--text-muted)">{{ row.description ?? "—" }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Vaqt" width="100" align="center">
        <template #default="{ row }">
          <span v-if="row.time" class="font-semibold" style="color: var(--text)">{{ row.time.slice(0, 5) }}</span>
          <span v-else style="color: var(--text-faint)">—</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Faol" width="90" align="center">
        <template #default="{ row }">
          <span class="badge" :style="row.isActive
            ? { background: 'var(--success-soft)', color: 'var(--success)' }
            : { background: 'var(--surface-2)', color: 'var(--text-faint)' }">
            {{ row.isActive ? "Ha" : "Yo'q" }}
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Amallar" width="120" align="right">
        <template #default="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <button class="icon-act" title="Tahrirlash" style="color: var(--brand-strong); background: var(--brand-soft)" @click="goToEdit(row)">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <ElPopconfirm title="O'chirishni tasdiqlaysizmi?" confirm-button-text="Ha" cancel-button-text="Yo'q" @confirm="handleDelete(row)">
              <template #reference>
                <button class="icon-act" title="O'chirish" style="color: var(--danger); background: var(--danger-soft)">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>

<style scoped>
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 4px 12px rgba(var(--brand-rgb), 0.3);
  transition: all 0.15s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.icon-act {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.icon-act:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}
</style>
