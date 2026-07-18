<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElTableColumn,
  ElSelect,
  ElOption,
  ElMessage,
  ElMessageBox,
} from "element-plus";
import Card from "../../../components/ui/Card.vue";
import DataTable from "../../../components/shared/DataTable.vue";
import Icon from "../components/Icon.vue";
import { useCrmStore, type LeadDto, type LeadStatus } from "../../../stores/crmStore";
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

// Ommaviy (bulk) biriktirish
const selected = ref<LeadDto[]>([]);
const bulkOperator = ref<number | undefined>(undefined);

const loader = (skip: number, take: number) =>
  crmStore.loadLeads({
    skip,
    take,
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    unassigned: scope.value === "unassigned" ? true : undefined,
    // Taqsimlash tartibi: oxirgi faollik bo'yicha — eng so'nggi faol lead tepada.
    sortByActivity: true,
  });

const reload = () => {
  selected.value = [];
  tableKey.value++;
};

const setScope = (s: "all" | "unassigned") => {
  scope.value = s;
  reload();
};

const loadOperators = async () => {
  const res = await salesStore.getOperators();
  operators.value = res.content ?? [];
};

onMounted(loadOperators);

// Safe status lookup (legacy rows could carry an unknown value).
const statusMeta = (s: LeadStatus) => STATUS_META[s] ?? STATUS_META.New;

// Operatorni yuklamasi bilan ko'rsatish: "Ali · 12 ta"
const operatorLabel = (o: OperatorLeaderboardRowDto) =>
  `${o.operatorName} · ${o.activeLeads} ta`;

const onSelectionChange = (rows: LeadDto[]) => {
  selected.value = rows;
};

const assign = async (leadId: number, operatorId: number) => {
  try {
    await salesStore.assignLead(leadId, operatorId);
    const op = operators.value.find((o) => o.operatorId === operatorId);
    ElMessage.success(`"${op?.operatorName ?? operatorId}"ga biriktirildi`);
    await loadOperators();
    reload();
  } catch {
    ElMessage.error("Biriktirib bo'lmadi");
  }
};

const assignSelected = async () => {
  if (!bulkOperator.value || !selected.value.length) return;
  const ids = selected.value.map((l) => l.id);
  const op = operators.value.find((o) => o.operatorId === bulkOperator.value);
  try {
    await salesStore.assignLeadsBulk(ids, bulkOperator.value);
    ElMessage.success(`${ids.length} ta lead "${op?.operatorName ?? ""}"ga biriktirildi`);
    bulkOperator.value = undefined;
    await loadOperators();
    reload();
  } catch {
    ElMessage.error("Ommaviy biriktirib bo'lmadi");
  }
};

const unassign = async (row: LeadDto) => {
  try {
    await ElMessageBox.confirm(
      `"${row.userName ?? "Lead"}" operatordan olib qo'yiladi va "Yangi" holatiga qaytadi. Davom etamizmi?`,
      "Operatordan olib qo'yish",
      { confirmButtonText: "Ha, olib qo'y", cancelButtonText: "Bekor", type: "warning" },
    );
  } catch {
    return;
  }
  try {
    await salesStore.unassignLead(row.id);
    ElMessage.success(`"${row.userName ?? "Lead"}" bo'sh pulga qaytarildi`);
    await loadOperators();
    reload();
  } catch {
    ElMessage.error("Olib qo'yib bo'lmadi");
  }
};

const openDetail = (id: number) =>
  router.push({ name: "crm_lead_detail", params: { leadId: id } });

const clearSelection = () => {
  selected.value = [];
  tableKey.value++;
};

const totalActive = computed(() =>
  operators.value.reduce((s, o) => s + o.activeLeads, 0),
);
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title"><Icon name="users" :size="22" /> Leadlar</h1>
        <p class="page-sub">Leadlarni operatorlarga bo'lib bering — eng issiq va yangi leadlar yuqorida</p>
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

      <!-- Ommaviy biriktirish paneli: qatorlar tanlanganda chiqadi -->
      <transition name="bulk">
        <div v-if="selected.length" class="bulkbar">
          <span class="bulk-count"><Icon name="check-circle" :size="16" /> {{ selected.length }} ta lead tanlandi</span>
          <div class="bulk-actions">
            <ElSelect v-model="bulkOperator" placeholder="Operatorni tanlang" style="width: 230px" filterable>
              <ElOption v-for="o in operators" :key="o.operatorId" :value="o.operatorId" :label="operatorLabel(o)" />
            </ElSelect>
            <button class="btn-primary" :disabled="!bulkOperator" @click="assignSelected">
              <Icon name="user-plus" :size="15" /> Biriktirish
            </button>
            <button class="btn-ghost" @click="clearSelection">Bekor</button>
          </div>
        </div>
      </transition>

      <DataTable :key="tableKey" :loader="loader" @selection-change="onSelectionChange">
        <ElTableColumn type="selection" width="44" />

        <ElTableColumn label="Mijoz" min-width="230">
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

        <ElTableColumn label="Ball" width="104" align="center">
          <template #default="{ row }">
            <span class="temp" :style="{ background: TEMP_META[row.temperature]?.soft, color: TEMP_META[row.temperature]?.color }">
              <Icon :name="TEMP_META[row.temperature]?.icon ?? 'snowflake'" :size="12" /> {{ row.score }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Operator" min-width="240">
          <template #default="{ row }">
            <div class="op-cell">
              <ElSelect
                :model-value="row.operatorId ?? undefined"
                :placeholder="row.operatorName ?? 'Belgilanmagan'"
                size="default"
                filterable
                style="width: 180px"
                @change="(v: number) => assign(row.id, v)"
              >
                <ElOption v-for="o in operators" :key="o.operatorId" :value="o.operatorId" :label="operatorLabel(o)" />
              </ElSelect>
              <button v-if="row.operatorId" class="take-btn" title="Operatordan olib qo'yish" @click="unassign(row)">
                <Icon name="user" :size="14" /><Icon name="x" :size="11" />
              </button>
              <span v-else class="unassigned-dot" title="Belgilanmagan" />
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Oxirgi faollik" min-width="140">
          <template #default="{ row }">
            <span style="color: var(--text-muted)">{{ relativeTime(row.lastActivity) }}</span>
          </template>
        </ElTableColumn>
      </DataTable>

      <p class="foot-note">
        <Icon name="users" :size="13" /> Operatorlarda jami {{ totalActive }} ta faol lead
      </p>
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

/* Ommaviy biriktirish paneli */
.bulkbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  margin-bottom: 12px; padding: 12px 14px; border-radius: 13px;
  background: var(--brand-soft); border: 1px solid var(--brand);
}
.bulk-count { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: var(--brand-strong); }
.bulk-actions { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 16px; border-radius: 9px;
  background: var(--brand-strong); color: #fff; font-size: 13px; font-weight: 600; transition: opacity 0.15s ease;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { height: 34px; padding: 0 12px; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--text-muted); }
.btn-ghost:hover { color: var(--text); background: var(--surface-2); }
.bulk-enter-active, .bulk-leave-active { transition: all 0.18s ease; }
.bulk-enter-from, .bulk-leave-to { opacity: 0; transform: translateY(-6px); }

.cust { display: flex; align-items: center; gap: 11px; cursor: pointer; }
.avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
.cust-name { font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cust-sub { font-size: 12px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.status, .temp { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.op-cell { display: flex; align-items: center; gap: 8px; }
.take-btn {
  display: inline-flex; align-items: center; gap: 1px; height: 30px; padding: 0 8px; border-radius: 8px;
  background: var(--danger-soft); color: var(--danger); flex-shrink: 0; transition: filter 0.15s ease;
}
.take-btn:hover { filter: brightness(0.94); }
.unassigned-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warning); flex-shrink: 0; box-shadow: 0 0 0 3px var(--warning-soft); }
.foot-note { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px; color: var(--text-faint); }
</style>
