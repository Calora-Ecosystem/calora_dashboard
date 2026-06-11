<script setup lang="ts">
import { ElTableColumn } from "element-plus";
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

const setFilter = (p: LeadPriority | "") => {
  priorityFilter.value = p;
  tableKey.value++;
};

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

const initials = (name: string | null) =>
  (name?.trim()?.[0] ?? "?").toUpperCase();

const avatarHue = (id: number) => (id * 47) % 360;

const goToDetail = (leadId: number) => {
  router.push({ name: "crm_lead_detail", params: { leadId } });
};

const filters: { key: LeadPriority | ""; label: string }[] = [
  { key: "", label: "Hammasi" },
  { key: "High", label: "Yuqori" },
  { key: "Medium", label: "O'rta" },
  { key: "Low", label: "Past" },
  { key: "Closed", label: "Yopilgan" },
];
</script>

<template>
  <Card title="Leadlar" subtitle="Sotuv jamoasi uchun mijozlar oqimi">
    <template #actions>
      <div class="seg">
        <button
          v-for="f in filters"
          :key="f.key || 'all'"
          type="button"
          class="seg-btn"
          :class="{ 'seg-active': priorityFilter === f.key }"
          @click="setFilter(f.key)"
        >{{ f.label }}</button>
      </div>
    </template>

    <DataTable :key="tableKey" :loader="loader">
      <ElTableColumn label="Mijoz" min-width="260">
        <template #default="{ row }">
          <div class="flex items-center gap-3 cursor-pointer" @click="goToDetail(row.id)">
            <div class="avatar" :style="{ background: `hsl(${avatarHue(row.id)} 70% 92%)`, color: `hsl(${avatarHue(row.id)} 65% 38%)` }">
              {{ initials(row.userName) }}
            </div>
            <div class="min-w-0">
              <div class="font-semibold leading-tight truncate" style="color: var(--text)">{{ row.userName ?? "Noma'lum" }}</div>
              <div class="flex flex-col gap-0.5 mt-0.5">
                <CopyText v-if="row.userEmail" :text="row.userEmail" class="text-[12px]" style="color: var(--text-faint)" />
                <CopyText v-if="row.userPhone" :text="row.userPhone" class="text-[12px]" style="color: var(--text-faint)" />
              </div>
            </div>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Prioritet" width="120">
        <template #default="{ row }">
          <span class="badge" :style="{ background: priorityStyle(row.priority).bg, color: priorityStyle(row.priority).color }">
            {{ priorityLabel(row.priority) }}
          </span>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Holat" min-width="180">
        <template #default="{ row }">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="pill" :class="row.isRegistered ? 'pill-on' : 'pill-off'">
              {{ row.isRegistered ? "Ro'yxatdan o'tgan" : "Ro'yxatdan o'tmagan" }}
            </span>
            <span v-if="row.purchased" class="pill pill-buy">✓ Sotib olgan</span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Obuna ko'rish" width="130" align="center">
        <template #default="{ row }">
          <span class="views-chip">👁 {{ row.subscriptionOpenedCount }}</span>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Oxirgi faollik" min-width="160">
        <template #default="{ row }">
          <span style="color: var(--text-muted)">{{ formatDate(row.lastActivity) }}</span>
        </template>
      </ElTableColumn>

      <ElTableColumn label="" width="90" align="right" fixed="right">
        <template #default="{ row }">
          <button class="open-btn" @click="goToDetail(row.id)">
            Ochish
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>

<style scoped>
.seg {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 3px;
  border-radius: 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  gap: 2px;
}
.seg-btn {
  padding: 6px 13px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s ease;
}
.seg-btn:hover {
  color: var(--text);
}
.seg-active {
  background: var(--surface);
  color: var(--brand-strong);
  box-shadow: var(--shadow-sm);
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}
.pill-on { background: var(--brand-soft); color: var(--brand-strong); }
.pill-off { background: var(--surface-2); color: var(--text-faint); }
.pill-buy { background: var(--info-soft); color: var(--info); }
.views-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}
.open-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 32px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  transition: all 0.15s ease;
}
.open-btn:hover {
  filter: brightness(0.96);
  transform: translateX(1px);
}
</style>
