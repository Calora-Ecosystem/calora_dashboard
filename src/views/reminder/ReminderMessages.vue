<script setup lang="ts">
import { ElButton, ElMessageBox, ElTableColumn, ElTag } from "element-plus";
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
  try {
    await ElMessageBox.confirm(
      `"${row.title ?? row.type}" xabarini o'chirishni xohlaysizmi?`,
      "Tasdiqlash",
      {
        confirmButtonText: "Ha",
        cancelButtonText: "Yo'q",
        type: "warning",
      }
    );
  } catch {
    return;
  }
  const res = await reminderStore.deleteMessage(row.id);
  if (res.code === 200) tableKey.value++;
};

const typeTagColor = (type: string) => {
  switch (type) {
    case "Food":
      return "success";
    case "Water":
      return "primary";
    case "Sleep":
      return "info";
    case "DailyChallenge":
      return "warning";
    default:
      return "info";
  }
};
</script>

<template>
  <Card title="Eslatma xabarlari">
    <div class="flex justify-end mb-3">
      <RouterLink :to="{ name: 'reminder_message_create' }">
        <ElButton size="large" type="primary">Yaratish</ElButton>
      </RouterLink>
    </div>

    <DataTable :key="tableKey" :loader="reminderStore.loadMessages">
      <ElTableColumn label="ID" prop="id" width="70" fixed />
      <ElTableColumn label="Turi" width="160">
        <template #default="{ row }">
          <ElTag :type="typeTagColor(row.type)" size="small">{{ row.type }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Menyu" width="120">
        <template #default="{ row }">
          <ElTag v-if="row.menu" size="small" type="info">{{ row.menu }}</ElTag>
          <span v-else class="text-gray-400">—</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Sarlavha" prop="title" />
      <ElTableColumn label="Tavsif" prop="description" show-overflow-tooltip />
      <ElTableColumn label="Amallar" width="200">
        <template #default="{ row }">
          <div class="flex gap-1 flex-wrap">
            <ElButton size="small" type="primary" @click="goToEdit(row)">
              Tahrirlash
            </ElButton>
            <ElButton size="small" type="danger" @click="handleDelete(row)">
              O'chirish
            </ElButton>
          </div>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>
