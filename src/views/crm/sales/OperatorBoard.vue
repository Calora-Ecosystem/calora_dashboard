<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "../components/Icon.vue";
import {
  useCrmStore,
  type LeadDto,
  type LeadStatus,
  type StatsPeriod,
  type OperatorStatsDto,
} from "../../../stores/crmStore";
import { useSalesStore } from "../../../stores/salesStore";
import { STATS_PERIODS } from "../../../constants/ApiContstants";
import {
  KANBAN_STATUSES,
  STATUS_META,
  TEMP_META,
  PERIOD_LABEL,
  initials,
  avatarHue,
} from "../crmMeta";
import { formatMoney } from "../../../utils/FormatHelper";

const route = useRoute();
const router = useRouter();
const crmStore = useCrmStore();
const salesStore = useSalesStore();

const operatorId = Number(route.params.operatorId);
const operatorName = ref<string>("");
const period = ref<StatsPeriod>("Month");
const stats = ref<OperatorStatsDto | null>(null);

const columns = reactive<Record<LeadStatus, LeadDto[]>>({
  New: [], Assigned: [], Contacted: [], Interested: [], FollowUp: [], Won: [], Lost: [],
});

const loadColumn = async (status: LeadStatus) => {
  const res = await crmStore.loadLeads({
    skip: 0,
    take: 100,
    status,
    operatorId,
    sortPropName: "score",
    sortDirection: "Descending",
  });
  columns[status] = res.content ?? [];
  const first = res.content?.[0];
  if (first?.operatorName) operatorName.value = first.operatorName;
};

const loadStats = async () => {
  const res = await salesStore.getOperatorStats(operatorId, period.value);
  stats.value = res.content;
};

onMounted(async () => {
  await Promise.all([...KANBAN_STATUSES.map(loadColumn), loadStats()]);
});

const setPeriod = (p: StatsPeriod) => {
  period.value = p;
  loadStats();
};

const minis = [
  { key: "leadsWorked", label: "Ishlangan", icon: "users" },
  { key: "calls", label: "Qo'ng'iroq", icon: "phone" },
  { key: "sales", label: "Sotuv", icon: "check-circle" },
  { key: "conversionRate", label: "Conversion", icon: "trending-up", suffix: "%" },
] as const;
</script>

<template>
  <div class="page">
    <button class="back" @click="router.back()"><Icon name="arrow-left" :size="16" /> Operatorlar</button>

    <header class="page-head">
      <h1 class="page-title"><Icon name="briefcase" :size="22" /> {{ operatorName || "Operator" }} — kanban</h1>
      <div class="seg">
        <button v-for="p in STATS_PERIODS" :key="p" class="seg-btn" :class="{ 'seg-active': period === p }" @click="setPeriod(p)">{{ PERIOD_LABEL[p] }}</button>
      </div>
    </header>

    <section class="minis">
      <div v-for="m in minis" :key="m.key" class="mini">
        <span class="mini-ic"><Icon :name="m.icon" :size="15" /></span>
        <div>
          <span class="mini-lbl">{{ m.label }}</span>
          <b class="mini-val">{{ stats ? (stats as any)[m.key] : 0 }}{{ (m as any).suffix ?? "" }}</b>
        </div>
      </div>
      <div class="mini">
        <span class="mini-ic"><Icon name="wallet" :size="15" /></span>
        <div>
          <span class="mini-lbl">Tushum</span>
          <b class="mini-val">{{ formatMoney(stats?.revenue ?? 0) }}</b>
        </div>
      </div>
    </section>

    <div class="board">
      <section v-for="status in KANBAN_STATUSES" :key="status" class="col">
        <div class="col-head">
          <span class="col-chip" :style="{ background: STATUS_META[status].soft, color: STATUS_META[status].color }">
            <Icon :name="STATUS_META[status].icon" :size="13" />
          </span>
          <span class="col-title">{{ STATUS_META[status].label }}</span>
          <span class="col-count">{{ columns[status].length }}</span>
        </div>
        <div class="col-rule" :style="{ background: STATUS_META[status].color }" />
        <div class="col-body">
          <article v-for="lead in columns[status]" :key="lead.id" class="lead">
            <div class="avatar" :style="{ background: `hsl(${avatarHue(lead.id)} 70% 92%)`, color: `hsl(${avatarHue(lead.id)} 65% 38%)` }">{{ initials(lead.userName) }}</div>
            <div class="min-w-0 grow">
              <div class="lead-name">{{ lead.userName ?? "Noma'lum" }}</div>
              <div class="lead-sub">{{ lead.userPhone ?? lead.userEmail ?? "—" }}</div>
            </div>
            <span class="temp" :style="{ background: TEMP_META[lead.temperature].soft, color: TEMP_META[lead.temperature].color }">
              <Icon :name="TEMP_META[lead.temperature].icon" :size="11" /> {{ lead.score }}
            </span>
          </article>
          <div v-if="!columns[status].length" class="col-empty">Bo'sh</div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 14px; }
.back {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  font-size: 13px; font-weight: 600; color: var(--text-muted);
  padding: 6px 10px; border-radius: 9px; transition: all 0.15s ease;
}
.back:hover { color: var(--text); background: var(--surface-2); }
.page-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 21px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.page-title :deep(.crm-icon) { color: var(--brand-strong); }
.seg { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); gap: 2px; }
.seg-btn { padding: 6px 13px; border-radius: 7px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); transition: all 0.15s ease; }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.minis { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 11px; }
.mini {
  display: flex; align-items: center; gap: 11px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 13px; padding: 12px 14px;
}
.mini-ic {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--brand-soft); color: var(--brand-strong);
}
.mini-lbl { display: block; font-size: 11.5px; color: var(--text-faint); }
.mini-val { font-size: 18px; font-weight: 800; color: var(--text); }
.board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 10px; align-items: flex-start; scrollbar-width: thin; }
.col {
  flex: 0 0 252px; width: 252px; background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 16px; display: flex; flex-direction: column; max-height: calc(100vh - 270px);
}
.col-head { display: flex; align-items: center; gap: 8px; padding: 12px 13px 8px; }
.col-chip { width: 24px; height: 24px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.col-title { font-size: 12.5px; font-weight: 700; color: var(--text); flex: 1; }
.col-count { font-size: 11.5px; font-weight: 700; color: var(--text-muted); background: var(--surface); border-radius: 999px; padding: 1px 8px; }
.col-rule { height: 3px; margin: 0 13px; border-radius: 999px; opacity: 0.85; }
.col-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; scrollbar-width: thin; }
.lead {
  display: flex; align-items: center; gap: 9px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 10px;
}
.avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.lead-name { font-size: 12.5px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lead-sub { font-size: 11px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.temp { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 700; padding: 3px 6px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
.col-empty { text-align: center; font-size: 12px; color: var(--text-faint); padding: 14px 0; }
@media (max-width: 600px) { .page-title { font-size: 18px; } }
</style>
