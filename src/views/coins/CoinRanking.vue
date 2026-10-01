<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton, ElInput, ElPagination } from "element-plus";
import { useCoinStore } from "../../stores/coinStore";
import { makeFileUrl } from "../../integrations/axios";
import type { CoinRankingRowDto, CoinSummaryDto } from "../../@types/coin";
import { useIsMobile } from "../../composables/useIsMobile";
import PeriodFilter from "./PeriodFilter.vue";
import {
  MEDAL_COLORS,
  avatarHue,
  formatNumber,
  initials,
  periodFromQuery,
  periodToQuery,
  relativeTime,
  resolvePeriod,
  type PeriodState,
} from "./coinMeta";

const route = useRoute();
const router = useRouter();
const coinStore = useCoinStore();
const isMobile = useIsMobile();

const period = ref<PeriodState>(periodFromQuery(route.query));
const search = ref(typeof route.query.q === "string" ? route.query.q : "");
const page = ref(Math.max(Number(route.query.page) || 1, 1));
const pageSize = ref(20);

const summary = ref<CoinSummaryDto | null>(null);
const rows = ref<CoinRankingRowDto[]>([]);
const total = ref(0);
const loading = ref(false);

const apiPeriod = computed(() => resolvePeriod(period.value));

const syncQuery = () =>
  router.replace({
    query: {
      ...periodToQuery(period.value),
      ...(search.value.trim() ? { q: search.value.trim() } : {}),
      ...(page.value > 1 ? { page: String(page.value) } : {}),
    },
  });

const loadSummary = async () => {
  summary.value = await coinStore.getSummary(apiPeriod.value);
};

const loadList = async () => {
  loading.value = true;
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
    loading.value = false;
  }
  syncQuery();
};

onMounted(() => Promise.all([loadSummary(), loadList()]));

watch(period, () => {
  page.value = 1;
  loadSummary();
  loadList();
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadList();
  }, 350);
});

const onPage = (p: number) => {
  page.value = p;
  loadList();
};

const openUser = (userId: number) =>
  router.push({ name: "coin_user", params: { userId }, query: periodToQuery(period.value) });

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

// G'oliblarni taqdirlash uchun joriy sahifa kontaktlari bilan.
const exportCsv = () => {
  const header = ["O'rin", "User ID", "Ism", "Email", "Telefon", "Davrda yig'gan", "Qadamdan", "Bonus", "Faol kunlar", "Balans"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.value.map((r) =>
    [r.rank, r.userId, r.name, r.email, r.phone, r.earned, r.stepCoins, r.bonusCoins, r.activeDays, r.balance].map(esc).join(","),
  );
  const blob = new Blob(["﻿" + [header.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
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
    <header class="page-head">
      <h1 class="page-title">Coin reytingi</h1>
      <PeriodFilter v-model="period" />
    </header>

    <div class="kpis">
      <div class="app-card kpi">
        <span class="kpi-label">Ishtirokchilar</span>
        <span class="kpi-value">{{ formatNumber(summary?.participants) }}</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Yig'ilgan coin</span>
        <span class="kpi-value coin">{{ formatNumber(summary?.earned) }}</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">O'rtacha / user</span>
        <span class="kpi-value">{{ summary?.avgPerParticipant ?? 0 }}</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Sarflangan</span>
        <span class="kpi-value">{{ formatNumber(summary?.spent) }}</span>
      </div>
    </div>

    <section class="app-card box">
      <div class="box-head">
        <div class="tools">
          <ElInput v-model="search" clearable placeholder="Ism, telefon yoki ID" class="search" />
          <ElButton plain :disabled="!rows.length" @click="exportCsv">CSV</ElButton>
        </div>
        <span class="faint text-[12.5px] hide-sm">{{ formatNumber(total) }} ta user</span>
      </div>

      <div class="tbl-wrap" v-loading="loading">
        <table class="tbl">
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Foydalanuvchi</th>
              <th class="num">Coin</th>
              <th class="num hide-sm">Faol kun</th>
              <th class="num hide-sm">Balans</th>
              <th class="num hide-sm">Oxirgi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.userId" class="click" @click="openUser(r.userId)">
              <td class="rank" :style="r.rank <= 3 ? { color: MEDAL_COLORS[r.rank - 1] } : {}">{{ r.rank }}</td>
              <td>
                <div class="user">
                  <img v-if="r.photo" :src="makeFileUrl(r.photo)" class="avatar" />
                  <span v-else class="avatar" :style="avatarStyle(r.userId)">{{ initials(r.name) }}</span>
                  <div class="min-w-0">
                    <p class="u-name">{{ r.name || "—" }}</p>
                    <p class="u-sub">{{ r.phone || r.email || `ID ${r.userId}` }}</p>
                  </div>
                </div>
              </td>
              <td class="num"><b class="coin">{{ formatNumber(r.earned) }}</b></td>
              <td class="num hide-sm">{{ r.activeDays }}</td>
              <td class="num hide-sm">{{ formatNumber(r.balance) }}</td>
              <td class="num hide-sm faint nowrap">{{ relativeTime(r.lastEarnedAt) }}</td>
            </tr>
            <tr v-if="!rows.length && !loading">
              <td colspan="6" class="empty">{{ search.trim() ? "Topilmadi" : "Ma'lumot yo'q" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > pageSize" class="pager">
        <ElPagination
          background
          :small="isMobile"
          :pager-count="isMobile ? 5 : 7"
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="onPage"
        />
      </div>
    </section>
  </div>
</template>

<style scoped src="./admin.css"></style>
