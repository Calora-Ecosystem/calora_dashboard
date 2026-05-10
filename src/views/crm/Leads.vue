<script setup lang="ts">
import { ElButton, ElOption, ElSelect, ElTableColumn, ElTag } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import CopyText from "../../components/shared/CopyText.vue";
import { useCrmStore, type LeadPriority } from "../../stores/crmStore";
import { LEAD_PRIORITIES } from "../../constants/ApiContstants";
import { formatDate } from "../../utils/FormatHelper";

const crmStore = useCrmStore();
const router = useRouter();

const priorityFilter = ref<LeadPriority | "">("");
const tableKey = ref(0);

const loader = (skip: number, take: number) =>
  crmStore.loadLeads({
    skip,
    take,
    priority: priorityFilter.value || undefined,
    sortPropName: "lastActivity",
    sortDirection: "Descending",
  });

const onFilterChange = () => {
  tableKey.value++;
};

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

const goToDetail = (leadId: number) => {
  router.push({ name: "crm_lead_detail", params: { leadId } });
};
</script>

<template>
  <Card title="Leadlar">
    <div class="flex flex-row gap-3 items-center mb-4">
      <ElSelect
        v-model="priorityFilter"
        placeholder="Prioritet bo'yicha filtr"
        clearable
        size="large"
        style="max-width: 240px"
        @change="onFilterChange"
        @clear="onFilterChange"
      >
        <ElOption
          v-for="p in LEAD_PRIORITIES"
          :key="p"
          :label="priorityLabel(p)"
          :value="p"
        />
      </ElSelect>
    </div>

    <DataTable :key="tableKey" :loader="loader">
      <ElTableColumn label="ID" prop="id" width="80" />

      <ElTableColumn label="Foydalanuvchi">
        <template #default="{ row }">
          <div class="flex flex-col text-sm">
            <span class="font-medium">{{ row.userName ?? "—" }}</span>
            <CopyText
              v-if="row.userEmail"
              :text="row.userEmail"
              class="text-gray-500 text-xs"
            />
            <CopyText
              v-if="row.userPhone"
              :text="row.userPhone"
              class="text-gray-500 text-xs"
            />
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Ro'yxatdan o'tgan" width="160">
        <template #default="{ row }">
          <ElTag :type="row.isRegistered ? 'success' : 'info'" size="small">
            {{ row.isRegistered ? "Ha" : "Yo'q" }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn
        label="Obuna ko'rishlar"
        prop="subscriptionOpenedCount"
        width="160"
      />

      <ElTableColumn label="Sotib olgan" width="130">
        <template #default="{ row }">
          <ElTag :type="row.purchased ? 'success' : 'info'" size="small">
            {{ row.purchased ? "Ha" : "Yo'q" }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Prioritet" width="130">
        <template #default="{ row }">
          <ElTag :type="priorityTagType(row.priority)" size="small">
            {{ priorityLabel(row.priority) }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Oxirgi faollik" width="170">
        <template #default="{ row }">
          {{ formatDate(row.lastActivity) }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="Amallar" width="140" fixed="right">
        <template #default="{ row }">
          <ElButton size="small" type="primary" @click="goToDetail(row.id)">
            Ochish
          </ElButton>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>
