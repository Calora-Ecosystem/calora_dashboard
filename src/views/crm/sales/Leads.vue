<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElTableColumn,
  ElSelect,
  ElOption,
  ElMessage,
} from "element-plus";
import Card from "../../../components/ui/Card.vue";
import DataTable from "../../../components/shared/DataTable.vue";
import Icon from "../components/Icon.vue";
import { useCrmStore, type LeadStatus } from "../../../stores/crmStore";
import {
  useSalesStore,
  type OperatorLeaderboardRowDto,
} from "../../../stores/salesStore";
import { LEAD_STATUSES } from "../../../constants/ApiContstants";
import { STATUS_META, TEMP_META, initials, avatarHue, relativeTime } from "../crmMeta";

const crmStore = useCrmStore();
const salesStore = useSalesStore();
const router = useRouter();

const operators = ref<OperatorLeaderboardRowDto[]>([]);
const search = ref("");
const statusFilter = ref<LeadStatus | "">("");
const scope = ref<"all" | "unassigned">("all");
const tableKey = ref(0);

const loader = (skip: number, take: number) =>
  crmStore.loadLeads({
    skip,
    take,
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    unassigned: scope.value === "unassigned" ? true : undefined,
    sortPropName: "score",
    sortDirection: "Descending",
  });

const reload = () => tableKey.value++;

const setScope = (s: "all" | "unassigned") => {
  scope.value = s;
  reload();
};

onMounted(async () => {
  const res = await salesStore.getOperators();
  operators.value = res.content ?? [];
});

// Safe status lookup (legacy rows could carry an unknown value).
const statusMeta = (s: LeadStatus) => STATUS_META[s] ?? STATUS_META.New;

const assign = async (leadId: number, operatorId: number) => {
  try {
    await salesStore.assignLead(leadId, operatorId);
    const op = operators.value.find((o) => o.operatorId === operatorId);
    ElMessage.success(`Operator "${op?.operatorName ?? operatorId}" biriktirildi`);
    reload();
  } catch {
    ElMessage.error("Biriktirib bo'lmadi");
  }
};

const openDetail = (id: number) =>
  router.push({ name: "crm_lead_detail", params: { leadId: id } });
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title"><Icon name="users" :size="22" /> Leadlar</h1>
        <p class="page-sub">Barcha leadlar va operatorga biriktirish</p>
      </div>
    </header>

    <Card>
      <template #title>
        <div class="bar">
          <div class="seg">
            <button class="seg-btn" :class="{ 'seg-active': scope === 'all' }" @click="setScope('all')">Hammasi</button>
            <button class="seg-btn" :class="{ 'seg-active': scope === 'unassigned' }" @click="setScope('unassigned')">
              <Icon name="user-plus" :size="14" /> Belgilanmagan
            </button>
          </div>
          <div class="filters">
            <ElSelect v-model="statusFilter" placeholder="Holat" clearable style="width: 160px" @change="reload">
              <ElOption v-for="s in LEAD_STATUSES" :key="s" :value="s" :label="statusMeta(s).label" />
            </ElSelect>
            <div class="search">
              <Icon name="search" :size="15" />
              <input v-model="search" placeholder="Qidirish…" @keyup.enter="reload" />
            </div>
          </div>
        </div>
      </template>

      <DataTable :key="tableKey" :loader="loader">
        <ElTableColumn label="Mijoz" min-width="240">
          <template #default="{ row }">
            <div class="cust" @click="openDetail(row.id)">
              <div class="avatar" :style="{ background: `hsl(${avatarHue(row.id)} 70% 92%)`, color: `hsl(${avatarHue(row.id)} 65% 38%)` }">{{ initials(row.userName) }}</div>
              <div class="min-w-0">
                <div class="cust-name">{{ row.userName ?? "Noma'lum" }}</div>
                <div class="cust-sub">{{ row.userPhone ?? row.userEmail ?? "—" }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Holat" width="150">
          <template #default="{ row }">
            <span class="status" :style="{ background: statusMeta(row.status).soft, color: statusMeta(row.status).color }">
              <Icon :name="statusMeta(row.status).icon" :size="12" /> {{ statusMeta(row.status).label }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Ball" width="110" align="center">
          <template #default="{ row }">
            <span class="temp" :style="{ background: TEMP_META[row.temperature]?.soft, color: TEMP_META[row.temperature]?.color }">
              <Icon :name="TEMP_META[row.temperature]?.icon ?? 'snowflake'" :size="12" /> {{ row.score }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Operator" min-width="210">
          <template #default="{ row }">
            <div class="op-cell">
              <ElSelect
                :model-value="row.operatorId ?? undefined"
                :placeholder="row.operatorName ?? 'Belgilanmagan'"
                size="default"
                style="width: 190px"
                @change="(v: number) => assign(row.id, v)"
              >
                <ElOption v-for="o in operators" :key="o.operatorId" :value="o.operatorId" :label="o.operatorName" />
              </ElSelect>
              <span v-if="!row.operatorId" class="unassigned-dot" title="Belgilanmagan" />
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Oxirgi faollik" min-width="150">
          <template #default="{ row }">
            <span style="color: var(--text-muted)">{{ relativeTime(row.lastActivity) }}</span>
          </template>
        </ElTableColumn>
      </DataTable>
    </Card>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.page-title :deep(.crm-icon) { color: var(--brand-strong); }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; width: 100%;
}
.seg { display: inline-flex; padding: 4px; border-radius: 11px; background: var(--surface-2); border: 1px solid var(--border); gap: 3px; }
.seg-btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); transition: all 0.15s ease; }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.filters { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.search { display: flex; align-items: center; gap: 7px; height: 34px; padding: 0 12px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-faint); }
.search input { width: 180px; max-width: 40vw; background: transparent; border: none; outline: none; font-size: 13px; color: var(--text); }
.cust { display: flex; align-items: center; gap: 11px; cursor: pointer; }
.avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
.cust-name { font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cust-sub { font-size: 12px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status, .temp { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.op-cell { display: flex; align-items: center; gap: 8px; }
.unassigned-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warning); flex-shrink: 0; box-shadow: 0 0 0 3px var(--warning-soft); }
</style>
