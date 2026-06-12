<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
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
</script>

<template>
  <div class="flex flex-col gap-4">
    <button class="back" @click="router.back()">← Operatorlar</button>

    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-[22px] font-extrabold" style="color: var(--text)">
        {{ operatorName || "Operator" }} — kanban
      </h1>
      <div class="seg">
        <button v-for="p in STATS_PERIODS" :key="p" class="seg-btn" :class="{ 'seg-active': period === p }" @click="setPeriod(p)">{{ PERIOD_LABEL[p] }}</button>
      </div>
    </div>

    <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))">
      <div class="mini"><span>Ishlangan</span><b>{{ stats?.leadsWorked ?? 0 }}</b></div>
      <div class="mini"><span>Qo'ng'iroq</span><b>{{ stats?.calls ?? 0 }}</b></div>
      <div class="mini"><span>Sotuv</span><b>{{ stats?.sales ?? 0 }}</b></div>
      <div class="mini"><span>Conversion</span><b>{{ stats?.conversionRate ?? 0 }}%</b></div>
      <div class="mini"><span>Tushum</span><b>{{ formatMoney(stats?.revenue ?? 0) }}</b></div>
    </div>

    <div class="board">
      <div v-for="status in KANBAN_STATUSES" :key="status" class="col">
        <div class="col-head" :style="{ borderColor: STATUS_META[status].color }">
          <span class="col-dot" :style="{ background: STATUS_META[status].color }" />
          <span class="col-title">{{ STATUS_META[status].label }}</span>
          <span class="col-count">{{ columns[status].length }}</span>
        </div>
        <div class="col-body">
          <article v-for="lead in columns[status]" :key="lead.id" class="lead">
            <div class="lead-top">
              <div class="avatar" :style="{ background: `hsl(${avatarHue(lead.id)} 70% 92%)`, color: `hsl(${avatarHue(lead.id)} 65% 38%)` }">{{ initials(lead.userName) }}</div>
              <div class="min-w-0 flex-1">
                <div class="lead-name">{{ lead.userName ?? "Noma'lum" }}</div>
                <div class="lead-sub">{{ lead.userPhone ?? lead.userEmail ?? "—" }}</div>
              </div>
              <span class="temp" :style="{ background: TEMP_META[lead.temperature].soft, color: TEMP_META[lead.temperature].color }">{{ TEMP_META[lead.temperature].emoji }} {{ lead.score }}</span>
            </div>
          </article>
          <div v-if="!columns[status].length" class="col-empty">Bo'sh</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back { font-size: 13px; font-weight: 600; color: var(--text-muted); align-self: flex-start; }
.seg {
  display: inline-flex; padding: 3px; border-radius: 10px;
  background: var(--surface-2); border: 1px solid var(--border); gap: 2px;
}
.seg-btn { padding: 6px 13px; border-radius: 7px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.mini {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 12px 14px; display: flex; flex-direction: column; gap: 3px;
}
.mini span { font-size: 11.5px; color: var(--text-faint); }
.mini b { font-size: 18px; color: var(--text); }
.board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 8px; align-items: flex-start; }
.col {
  flex: 0 0 250px; width: 250px; background: var(--surface-2);
  border: 1px solid var(--border); border-radius: 14px; display: flex; flex-direction: column;
  max-height: calc(100vh - 260px);
}
.col-head { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-bottom: 2px solid; }
.col-dot { width: 9px; height: 9px; border-radius: 50%; }
.col-title { font-size: 12.5px; font-weight: 700; color: var(--text); flex: 1; }
.col-count { font-size: 11.5px; font-weight: 700; color: var(--text-muted); background: var(--surface); border-radius: 999px; padding: 1px 8px; }
.col-body { padding: 9px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.lead { background: var(--surface); border: 1px solid var(--border); border-radius: 11px; padding: 10px; }
.lead-top { display: flex; align-items: center; gap: 9px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
.lead-name { font-size: 12.5px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lead-sub { font-size: 11px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.temp { font-size: 10.5px; font-weight: 700; padding: 3px 6px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
.col-empty { text-align: center; font-size: 12px; color: var(--text-faint); padding: 14px 0; }
</style>
