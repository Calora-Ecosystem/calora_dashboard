<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton, ElInput, ElPagination } from "element-plus";
import { useCoinStore } from "../../stores/coinStore";
import { makeFileUrl } from "../../integrations/axios";
import type { CoinRankingRowDto, CoinSummaryDto } from "../../@types/coin";
import PeriodFilter from "./PeriodFilter.vue";
import {
  MEDAL_COLORS,
  avatarHue,
  formatNumber,
  initials,
  periodFromQuery,
  periodLabel,
  periodToQuery,
  relativeTime,
  resolvePeriod,
  type PeriodState,
} from "./coinMeta";

const route = useRoute();
const router = useRouter();
const coinStore = useCoinStore();

const period = ref<PeriodState>(periodFromQuery(route.query));
const search = ref(typeof route.query.q === "string" ? route.query.q : "");
const page = ref(Math.max(Number(route.query.page) || 1, 1));
const pageSize = ref(20);

const summary = ref<CoinSummaryDto | null>(null);
const podium = ref<CoinRankingRowDto[]>([]);
const rows = ref<CoinRankingRowDto[]>([]);
const total = ref(0);
const loadingList = ref(false);
const loadingTop = ref(false);

const apiPeriod = computed(() => resolvePeriod(period.value));

const syncQuery = () => {
  router.replace({
    query: {
      ...periodToQuery(period.value),
      ...(search.value.trim() ? { q: search.value.trim() } : {}),
      ...(page.value > 1 ? { page: String(page.value) } : {}),
    },
  });
};

const loadTop = async () => {
  loadingTop.value = true;
  try {
    const [s, top] = await Promise.all([
      coinStore.getSummary(apiPeriod.value),
      coinStore.getRanking(apiPeriod.value, 0, 3),
    ]);
    summary.value = s;
    podium.value = top?.content ?? [];
  } finally {
    loadingTop.value = false;
  }
};

const loadList = async () => {
  loadingList.value = true;
  try {
    const res = await coinStore.getRanking(
      apiPeriod.value,
      (page.value - 1) * pageSize.value,
      pageSize.value,
      search.value,
    );
    rows.value = res?.content ?? [];
    total.value = res?.total ?? 0;
  } finally {
    loadingList.value = false;
  }
  syncQuery();
};

const reload = () => Promise.all([loadTop(), loadList()]);

onMounted(reload);

watch(period, () => {
  page.value = 1;
  reload();
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadList();
  }, 350);
});

const onPageChange = (p: number) => {
  page.value = p;
  loadList();
};

const onSizeChange = (s: number) => {
  pageSize.value = s;
  page.value = 1;
  loadList();
};

const openUser = (userId: number) =>
  router.push({ name: "coin_user", params: { userId }, query: periodToQuery(period.value) });

const periodText = computed(() =>
  summary.value ? periodLabel(summary.value.from, summary.value.to) : "",
);

// Podium tartibi: 2 — 1 — 3 (birinchi o'rin o'rtada).
const podiumOrdered = computed(() => {
  const [first, second, third] = podium.value;
  return [second, first, third].filter(Boolean) as CoinRankingRowDto[];
});

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

// ── CSV (joriy sahifa) — g'oliblarni taqdirlash uchun kontaktlar bilan ──
const exportCsv = () => {
  const header = [
    "O'rin", "User ID", "Ism", "Email", "Telefon", "Davrda yig'gan", "Qadamdan", "Bonus",
    "Faol kunlar", "Limitga yetgan kunlar", "Balans", "Umumiy yig'gan", "Sarflagan",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.value.map((r) =>
    [
      r.rank, r.userId, r.name, r.email, r.phone, r.earned, r.stepCoins, r.bonusCoins,
      r.activeDays, r.maxedDays, r.balance, r.totalEarned, r.totalSpent,
    ].map(esc).join(","),
  );
  const csv = "﻿" + [header.map(esc).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const p = apiPeriod.value;
  a.href = url;
  a.download = `coin-reyting_${p.from ?? "boshidan"}_${p.to ?? "bugungacha"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="page">
    <!-- Sarlavha + davr -->
    <header class="page-head">
      <div>
        <h1 class="page-title">
          <svg-icon icon="navbar/trophy.svg" class="title-icon" />
          Coin reytingi
        </h1>
        <p class="page-sub">
          Qadamdan yig'ilgan coinlar bo'yicha userlar reytingi — g'oliblarni aniqlash uchun
        </p>
      </div>
      <PeriodFilter v-model="period" />
    </header>

    <p v-if="periodText" class="period-note">
      <b>{{ periodText }}</b>
      <span>· Qadam coini qadam yurilgan kunga yoziladi (1 coin = {{ summary?.stepsPerCoin ?? 1000 }} qadam, kuniga ko'pi bilan {{ summary?.maxDailyCoins ?? 22 }} coin)</span>
    </p>

    <!-- KPI -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="app-card kpi">
        <span class="kpi-label">Ishtirokchilar</span>
        <span class="kpi-value">{{ formatNumber(summary?.participants) }}</span>
        <span class="kpi-sub">kamida 1 coin yig'gan userlar</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Yig'ilgan coin</span>
        <span class="kpi-value coin">{{ formatNumber(summary?.earned) }}</span>
        <span class="kpi-sub">
          qadamdan {{ formatNumber(summary?.stepCoins) }}<template v-if="summary?.bonusCoins"> · bonus {{ formatNumber(summary?.bonusCoins) }}</template>
        </span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">O'rtacha</span>
        <span class="kpi-value">{{ summary?.avgPerParticipant ?? 0 }}</span>
        <span class="kpi-sub">coin / ishtirokchi</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Sarflangan</span>
        <span class="kpi-value">{{ formatNumber(summary?.spent) }}</span>
        <span class="kpi-sub">muomalada {{ formatNumber(summary?.balanceInCirculation) }} coin</span>
      </div>
    </div>

    <!-- Podium: top 3 -->
    <section v-if="podiumOrdered.length" class="podium">
      <button
        v-for="p in podiumOrdered"
        :key="p.userId"
        class="app-card podium-card"
        :class="`place-${p.rank}`"
        @click="openUser(p.userId)"
      >
        <span class="place-badge" :style="{ background: MEDAL_COLORS[p.rank - 1] }">{{ p.rank }}</span>
        <img v-if="p.photo" :src="makeFileUrl(p.photo)" class="podium-avatar" />
        <span v-else class="podium-avatar" :style="avatarStyle(p.userId)">{{ initials(p.name) }}</span>
        <span class="podium-name">{{ p.name || "—" }}</span>
        <span class="podium-contact">{{ p.phone || p.email || `ID ${p.userId}` }}</span>
        <span class="podium-coins">
          {{ formatNumber(p.earned) }} <small>coin</small>
        </span>
        <span class="podium-meta">{{ p.activeDays }} faol kun · {{ p.maxedDays }} marta limit</span>
      </button>
    </section>
    <div v-else-if="!loadingTop" class="app-card empty-period">
      Bu davrda hech kim coin yig'magan
    </div>

    <!-- Reyting jadvali -->
    <section class="app-card table-card">
      <div class="table-toolbar">
        <ElInput
          v-model="search"
          clearable
          placeholder="Ism, email, telefon yoki ID bo'yicha qidirish"
          class="search"
        />
        <div class="flex items-center gap-2">
          <span class="total">{{ formatNumber(total) }} ta user</span>
          <ElButton plain :disabled="!rows.length" @click="exportCsv">CSV yuklab olish</ElButton>
          <ElButton plain :loading="loadingList || loadingTop" @click="reload">Yangilash</ElButton>
        </div>
      </div>

      <div class="table-wrap" v-loading="loadingList">
        <table class="lb">
          <thead>
            <tr>
              <th class="rank-col">O'rin</th>
              <th>Foydalanuvchi</th>
              <th class="num">Davrda yig'gan</th>
              <th class="num">Qadam / bonus</th>
              <th class="num">Faol kunlar</th>
              <th class="num">Balans</th>
              <th class="num">Umumiy yig'gan</th>
              <th class="num">Oxirgi coin</th>
              <th class="chev-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.userId"
              :class="{ top: r.rank <= 3 }"
              @click="openUser(r.userId)"
            >
              <td class="rank-col">
                <span
                  v-if="r.rank <= 3"
                  class="medal"
                  :style="{ background: MEDAL_COLORS[r.rank - 1] + '26', color: MEDAL_COLORS[r.rank - 1] }"
                >{{ r.rank }}</span>
                <span v-else class="rank-num">{{ r.rank }}</span>
              </td>
              <td>
                <div class="user-cell">
                  <img v-if="r.photo" :src="makeFileUrl(r.photo)" class="avatar" />
                  <span v-else class="avatar" :style="avatarStyle(r.userId)">{{ initials(r.name) }}</span>
                  <div class="min-w-0">
                    <p class="user-name">{{ r.name || "—" }}</p>
                    <p class="user-sub">
                      <span>ID {{ r.userId }}</span>
                      <span v-if="r.phone || r.email"> · {{ r.phone || r.email }}</span>
                    </p>
                  </div>
                </div>
              </td>
              <td class="num"><b class="earned">{{ formatNumber(r.earned) }}</b></td>
              <td class="num muted">
                {{ formatNumber(r.stepCoins) }}<span v-if="r.bonusCoins" class="bonus"> +{{ formatNumber(r.bonusCoins) }}</span>
              </td>
              <td class="num">
                {{ r.activeDays }}
                <span v-if="r.maxedDays" class="maxed" title="Kunlik limitga yetgan kunlar">{{ r.maxedDays }}× limit</span>
              </td>
              <td class="num">{{ formatNumber(r.balance) }}</td>
              <td class="num muted">
                {{ formatNumber(r.totalEarned) }}
                <span v-if="r.totalSpent" class="spent">−{{ formatNumber(r.totalSpent) }}</span>
              </td>
              <td class="num muted nowrap">{{ relativeTime(r.lastEarnedAt) }}</td>
              <td class="chev-col">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </td>
            </tr>
            <tr v-if="!rows.length && !loadingList">
              <td colspan="9" class="empty">
                {{ search.trim() ? "Qidiruv bo'yicha user topilmadi" : "Ma'lumot yo'q" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > pageSize" class="pager">
        <ElPagination
          background
          layout="sizes, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :current-page="page"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.title-icon { width: 24px; height: 24px; }
.title-icon :deep(svg) { stroke: var(--brand-strong); stroke-width: 2; fill: none; }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.period-note { font-size: 12.5px; color: var(--text-faint); margin-top: -6px; }
.period-note b { color: var(--text); font-weight: 700; margin-right: 4px; }

.kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kpi-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); }
.kpi-value { font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.kpi-value.coin { color: var(--warning); }
.kpi-sub { font-size: 12px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Podium */
.podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: end; }
.podium-card {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 26px 14px 18px; text-align: center; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;
  border: 1px solid var(--border);
}
.podium-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.podium-card.place-2 { grid-column: 1; grid-row: 1; }
.podium-card.place-1 { grid-column: 2; grid-row: 1; }
.podium-card.place-3 { grid-column: 3; grid-row: 1; }
.podium-card.place-1 { padding-top: 34px; padding-bottom: 26px; border-color: #f5b40066; background: linear-gradient(180deg, #f5b40014, var(--surface) 60%); }
.podium-card.place-2 { border-color: #9aa7b455; }
.podium-card.place-3 { border-color: #cd7f3255; }
.place-badge {
  position: absolute; top: 10px; left: 50%; transform: translate(-50%, -50%);
  width: 28px; height: 28px; border-radius: 50%; color: #fff; font-weight: 800; font-size: 14px;
  display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);
}
.podium-avatar {
  width: 56px; height: 56px; border-radius: 50%; object-fit: cover; margin-bottom: 4px;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;
}
.place-1 .podium-avatar { width: 68px; height: 68px; font-size: 22px; }
.podium-name { font-weight: 700; font-size: 15px; color: var(--text); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.podium-contact { font-size: 12px; color: var(--text-faint); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.podium-coins { font-size: 24px; font-weight: 800; color: var(--warning); margin-top: 6px; }
.podium-coins small { font-size: 12px; font-weight: 600; color: var(--text-faint); }
.podium-meta { font-size: 11.5px; color: var(--text-faint); }
.empty-period { padding: 28px; text-align: center; color: var(--text-faint); font-size: 13.5px; }

/* Jadval */
.table-card { padding: 0; overflow: hidden; }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 14px 16px; }
.search { max-width: 360px; }
.total { font-size: 12.5px; color: var(--text-faint); margin-right: 4px; white-space: nowrap; }
.table-wrap { overflow-x: auto; }
.lb { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 860px; }
.lb th {
  text-align: left; padding: 12px 14px; font-size: 11.5px; font-weight: 600; white-space: nowrap;
  color: var(--text-faint); background: var(--surface-2); text-transform: uppercase; letter-spacing: 0.3px;
}
.lb td { padding: 11px 14px; border-top: 1px solid var(--border); color: var(--text); }
.lb tbody tr { cursor: pointer; transition: background 0.12s ease; }
.lb tbody tr:hover { background: var(--surface-2); }
.lb tr.top td { background: rgba(var(--brand-rgb), 0.04); }
.lb .num, .lb th.num { text-align: right; }
.muted { color: var(--text-muted) !important; }
.nowrap { white-space: nowrap; }
.rank-col { width: 64px; text-align: center !important; }
.chev-col { width: 36px; color: var(--text-faint); }
.chev-col svg { width: 16px; height: 16px; }
.medal { width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; }
.rank-num { font-size: 14px; font-weight: 700; color: var(--text-faint); }
.user-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; object-fit: cover;
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12.5px;
}
.user-name { font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
.user-sub { font-size: 12px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
.earned { font-size: 15px; font-weight: 800; color: var(--warning); }
.bonus { color: var(--purple); font-weight: 600; }
.spent { color: var(--danger); font-size: 12px; margin-left: 4px; }
.maxed {
  margin-left: 6px; padding: 1px 6px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: var(--success-soft); color: var(--success); white-space: nowrap;
}
.empty { text-align: center; color: var(--text-faint); padding: 30px; cursor: default; }
.pager { display: flex; justify-content: flex-end; padding: 14px 16px; border-top: 1px solid var(--border); }

@media (max-width: 700px) {
  .page-title { font-size: 19px; }
  .podium { gap: 8px; }
  .podium-card { padding: 22px 6px 12px; }
  .podium-avatar, .place-1 .podium-avatar { width: 44px; height: 44px; font-size: 15px; }
  .podium-name { font-size: 13px; }
  .podium-coins { font-size: 18px; }
  .podium-contact, .podium-meta { display: none; }
  .search { max-width: none; width: 100%; }
}
</style>
