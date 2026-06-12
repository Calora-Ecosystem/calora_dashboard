<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  useSalesStore,
  type OperatorLeaderboardRowDto,
} from "../../../stores/salesStore";
import type { StatsPeriod } from "../../../stores/crmStore";
import { STATS_PERIODS } from "../../../constants/ApiContstants";
import { PERIOD_LABEL, initials, avatarHue } from "../crmMeta";
import { formatMoney } from "../../../utils/FormatHelper";

const salesStore = useSalesStore();
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

const medal = (i: number) => ["🥇", "🥈", "🥉"][i] ?? `${i + 1}`;
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold" style="color: var(--text)">Operatorlar reytingi</h1>
        <p class="text-[13px]" style="color: var(--text-faint)">Eng ko'p sotgan operatorlar</p>
      </div>
      <div class="seg">
        <button v-for="p in STATS_PERIODS" :key="p" class="seg-btn" :class="{ 'seg-active': period === p }" @click="setPeriod(p)">{{ PERIOD_LABEL[p] }}</button>
      </div>
    </div>

    <div class="app-card p-0 overflow-hidden">
      <table class="lb">
        <thead>
          <tr>
            <th style="width: 60px">#</th>
            <th>Operator</th>
            <th class="num">Leadlar</th>
            <th class="num">Qo'ng'iroq</th>
            <th class="num">Sotuv</th>
            <th class="num">Conversion</th>
            <th class="num">Tushum</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.operatorId" :class="{ top: i < 3 }">
            <td class="rank">{{ medal(i) }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div class="avatar" :style="{ background: `hsl(${avatarHue(r.operatorId)} 70% 92%)`, color: `hsl(${avatarHue(r.operatorId)} 65% 38%)` }">{{ initials(r.operatorName) }}</div>
                <span class="font-semibold" style="color: var(--text)">{{ r.operatorName }}</span>
              </div>
            </td>
            <td class="num">{{ r.leads }}</td>
            <td class="num">{{ r.calls }}</td>
            <td class="num"><b>{{ r.sales }}</b></td>
            <td class="num">{{ r.conversionRate }}%</td>
            <td class="num">{{ formatMoney(r.revenue) }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="7" class="empty">Ma'lumot yo'q</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  gap: 2px;
}
.seg-btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}
.seg-active {
  background: var(--surface);
  color: var(--brand-strong);
  box-shadow: var(--shadow-sm);
}
.lb {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.lb th {
  text-align: left;
  padding: 13px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
  background: var(--surface-2);
}
.lb td {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  color: var(--text);
}
.lb .num { text-align: right; }
.lb th.num { text-align: right; }
.rank { font-size: 18px; text-align: center; }
.lb tr.top td { background: rgba(var(--brand-rgb), 0.04); }
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
}
.empty {
  text-align: center;
  color: var(--text-faint);
  padding: 28px;
}
</style>
