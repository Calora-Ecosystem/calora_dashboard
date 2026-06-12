<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "../components/Icon.vue";
import {
  useSalesStore,
  type OperatorLeaderboardRowDto,
} from "../../../stores/salesStore";
import type { StatsPeriod } from "../../../stores/crmStore";
import { STATS_PERIODS } from "../../../constants/ApiContstants";
import { PERIOD_LABEL, initials, avatarHue } from "../crmMeta";
import { formatMoney } from "../../../utils/FormatHelper";

const salesStore = useSalesStore();
const router = useRouter();
const period = ref<StatsPeriod>("Month");
const rows = ref<OperatorLeaderboardRowDto[]>([]);

const load = async () => {
  const res = await salesStore.getLeaderboard(period.value);
  rows.value = res.content ?? [];
};

onMounted(load);

const setPeriod = (p: StatsPeriod) => {
  period.value = p;
  load();
};

const RANK_COLORS = ["#f5b400", "#9aa7b4", "#cd7f32"];

const openBoard = (id: number) =>
  router.push({ name: "crm_sales_operator_board", params: { operatorId: id } });
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title"><Icon name="trophy" :size="22" /> Operatorlar reytingi</h1>
        <p class="page-sub">Eng ko'p sotgan operatorlar</p>
      </div>
      <div class="seg">
        <button v-for="p in STATS_PERIODS" :key="p" class="seg-btn" :class="{ 'seg-active': period === p }" @click="setPeriod(p)">{{ PERIOD_LABEL[p] }}</button>
      </div>
    </header>

    <div class="app-card table-wrap">
      <table class="lb">
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th>Operator</th>
            <th class="num">Leadlar</th>
            <th class="num">Qo'ng'iroq</th>
            <th class="num">Sotuv</th>
            <th class="num">Conversion</th>
            <th class="num">Tushum</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.operatorId" :class="{ top: i < 3 }" @click="openBoard(r.operatorId)">
            <td class="rank-col">
              <span v-if="i < 3" class="medal" :style="{ background: RANK_COLORS[i] + '22', color: RANK_COLORS[i] }">
                <Icon name="trophy" :size="15" />
              </span>
              <span v-else class="rank-num">{{ i + 1 }}</span>
            </td>
            <td>
              <div class="op-cell">
                <div class="avatar" :style="{ background: `hsl(${avatarHue(r.operatorId)} 70% 92%)`, color: `hsl(${avatarHue(r.operatorId)} 65% 38%)` }">{{ initials(r.operatorName) }}</div>
                <span class="op-name">{{ r.operatorName }}</span>
              </div>
            </td>
            <td class="num">{{ r.leads }}</td>
            <td class="num">{{ r.calls }}</td>
            <td class="num"><b class="sales">{{ r.sales }}</b></td>
            <td class="num">{{ r.conversionRate }}%</td>
            <td class="num revenue">{{ formatMoney(r.revenue) }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="7" class="empty">Ma'lumot yo'q</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.page-title :deep(.crm-icon) { color: var(--brand-strong); }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.seg { display: inline-flex; padding: 4px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--border); gap: 3px; }
.seg-btn { padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--text-muted); transition: all 0.15s ease; }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.table-wrap { padding: 0; overflow-x: auto; }
.lb { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 640px; }
.lb th {
  text-align: left; padding: 14px 16px; font-size: 11.5px; font-weight: 600;
  color: var(--text-faint); background: var(--surface-2); text-transform: uppercase; letter-spacing: 0.3px;
}
.lb td { padding: 13px 16px; border-top: 1px solid var(--border); color: var(--text); }
.lb tbody tr { cursor: pointer; transition: background 0.12s ease; }
.lb tbody tr:hover { background: var(--surface-2); }
.lb .num { text-align: right; }
.lb th.num { text-align: right; }
.rank-col { width: 64px; text-align: center; }
.medal {
  width: 30px; height: 30px; border-radius: 9px; display: inline-flex;
  align-items: center; justify-content: center;
}
.rank-num { font-size: 14px; font-weight: 700; color: var(--text-faint); }
.lb tr.top td { background: rgba(var(--brand-rgb), 0.04); }
.op-cell { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;
}
.op-name { font-weight: 600; color: var(--text); white-space: nowrap; }
.sales { font-weight: 800; color: var(--success); }
.revenue { font-weight: 600; }
.empty { text-align: center; color: var(--text-faint); padding: 30px; }
@media (max-width: 600px) { .page-title { font-size: 19px; } }
</style>
