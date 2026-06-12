<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  useSalesStore,
  type OperatorLeaderboardRowDto,
} from "../../../stores/salesStore";
import { initials, avatarHue } from "../crmMeta";
import { formatMoney } from "../../../utils/FormatHelper";

const salesStore = useSalesStore();
const router = useRouter();
const operators = ref<OperatorLeaderboardRowDto[]>([]);

onMounted(async () => {
  const res = await salesStore.getOperators();
  operators.value = res.content ?? [];
});

const openBoard = (id: number) =>
  router.push({ name: "crm_sales_operator_board", params: { operatorId: id } });
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <h1 class="text-[22px] font-extrabold" style="color: var(--text)">Operatorlar</h1>
      <p class="text-[13px]" style="color: var(--text-faint)">Jamoa a'zolari va ularning ko'rsatkichlari</p>
    </div>

    <div v-if="!operators.length" class="app-card empty">Operatorlar topilmadi</div>
    <div v-else class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
      <article v-for="op in operators" :key="op.operatorId" class="app-card op" @click="openBoard(op.operatorId)">
        <div class="flex items-center gap-3">
          <div class="avatar" :style="{ background: `hsl(${avatarHue(op.operatorId)} 70% 92%)`, color: `hsl(${avatarHue(op.operatorId)} 65% 38%)` }">
            {{ initials(op.operatorName) }}
          </div>
          <div class="min-w-0">
            <div class="font-bold truncate" style="color: var(--text)">{{ op.operatorName }}</div>
            <div class="text-[12px]" style="color: var(--text-faint)">{{ op.leads }} ta lead</div>
          </div>
          <span class="conv">{{ op.conversionRate }}%</span>
        </div>
        <div class="stat-grid">
          <div><span>Qo'ng'iroq</span><b>{{ op.calls }}</b></div>
          <div><span>Sotuv</span><b>{{ op.sales }}</b></div>
          <div class="full"><span>Tushum</span><b>{{ formatMoney(op.revenue) }}</b></div>
        </div>
        <button class="board-btn">Kanbanni ko'rish →</button>
      </article>
    </div>
  </div>
</template>

<style scoped>
.op {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 13px;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.15s ease;
}
.op:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  flex-shrink: 0;
}
.conv {
  margin-left: auto;
  font-size: 13px;
  font-weight: 800;
  color: var(--brand-strong);
  background: var(--brand-soft);
  padding: 4px 10px;
  border-radius: 999px;
}
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.stat-grid > div {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-grid .full { grid-column: span 2; }
.stat-grid span { font-size: 11.5px; color: var(--text-faint); }
.stat-grid b { font-size: 15px; color: var(--text); }
.board-btn {
  margin-top: 2px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-strong);
  text-align: left;
}
.empty {
  padding: 36px;
  text-align: center;
  color: var(--text-faint);
}
</style>
