<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton, ElDrawer, ElInput, ElOption, ElPagination, ElSelect } from "element-plus";
import { useAiScanStore } from "../../stores/aiScanStore";
import { makeFileUrl } from "../../integrations/axios";
import type {
  AdminScanSummaryDto,
  AdminScanUserDetailDto,
  AdminScanUserDto,
  ScanSort,
  ScanStatusFilter,
} from "../../@types/aiScan";
import {
  avatarHue,
  formatDateTime,
  formatDayYear,
  formatNumber,
  formatPercent,
  initials,
  relativeTime,
} from "../coins/coinMeta";

const route = useRoute();
const router = useRouter();
const aiScanStore = useAiScanStore();

const STATUS_TABS: { value: ScanStatusFilter; label: string }[] = [
  { value: "scanned", label: "Skan qilganlar" },
  { value: "exhausted", label: "Limiti tugagan" },
  { value: "available", label: "Skani qolgan" },
  { value: "bonus", label: "Bonus olganlar" },
  { value: "premium", label: "Premium" },
  { value: "all", label: "Hammasi" },
];

const SORTS: { value: ScanSort; label: string }[] = [
  { value: "used", label: "Ko'p bepul skan ishlatgan" },
  { value: "scans", label: "Ko'p skan qilgan (jami)" },
  { value: "remaining", label: "Kam skan qolgan" },
  { value: "recent", label: "Oxirgi skan" },
  { value: "newest", label: "Yangi ro'yxatdan o'tgan" },
];

const OUTCOMES: Record<string, { label: string; tone: string }> = {
  success: { label: "Taom topildi", tone: "ok" },
  empty_result: { label: "Taom topilmadi", tone: "warn" },
  provider_error: { label: "AI xatosi", tone: "bad" },
  invalid_result: { label: "Noto'g'ri natija", tone: "bad" },
  parse_error: { label: "Javob o'qilmadi", tone: "bad" },
};

const queryStr = (v: unknown) => (typeof v === "string" ? v : "");
const status = ref<ScanStatusFilter>(
  (STATUS_TABS.find((t) => t.value === route.query.status)?.value ?? "scanned") as ScanStatusFilter,
);
const sort = ref<ScanSort>((SORTS.find((s) => s.value === route.query.sort)?.value ?? "used") as ScanSort);
const search = ref(queryStr(route.query.q));
const page = ref(Math.max(Number(route.query.page) || 1, 1));
const pageSize = ref(20);

const summary = ref<AdminScanSummaryDto | null>(null);
const rows = ref<AdminScanUserDto[]>([]);
const total = ref(0);
const loadingSummary = ref(false);
const loadingList = ref(false);

const syncQuery = () => {
  router.replace({
    query: {
      ...(status.value !== "scanned" ? { status: status.value } : {}),
      ...(sort.value !== "used" ? { sort: sort.value } : {}),
      ...(search.value.trim() ? { q: search.value.trim() } : {}),
      ...(page.value > 1 ? { page: String(page.value) } : {}),
    },
  });
};

const loadSummary = async () => {
  loadingSummary.value = true;
  try {
    summary.value = await aiScanStore.getSummary();
  } finally {
    loadingSummary.value = false;
  }
};

const loadList = async () => {
  loadingList.value = true;
  try {
    const res = await aiScanStore.getUsers({
      status: status.value,
      sort: sort.value,
      search: search.value,
      skip: (page.value - 1) * pageSize.value,
      take: pageSize.value,
    });
    rows.value = res?.content ?? [];
    total.value = res?.total ?? 0;
  } finally {
    loadingList.value = false;
  }
  syncQuery();
};

const reload = () => Promise.all([loadSummary(), loadList()]);

onMounted(reload);

watch([status, sort], () => {
  page.value = 1;
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

const onPageChange = (p: number) => {
  page.value = p;
  loadList();
};

const onSizeChange = (s: number) => {
  pageSize.value = s;
  page.value = 1;
  loadList();
};

// ── Free tarif sozlamasi ───────────────────────────────────────────
// AiQuotaService bilan bir xil: faol Free tarif yoki uning AiScans qiymati bo'lmasa limit 0.
const configAlert = computed(() => {
  const s = summary.value;
  if (!s) return null;
  if (!s.freePlanActive)
    return {
      tone: "bad",
      title: "Free tarif faol emas — bepul userlarning skan limiti 0",
      text: "Premiumsiz userlar ilovada birorta ham skan qila olmaydi (ai_free_limit_exceeded). Free tarifni yoqing va AI Skan limitini kiriting.",
    };
  if (!s.freeLimitConfigured)
    return {
      tone: "bad",
      title: "Free tarifda AI Skan limiti belgilanmagan — limit 0",
      text: "Free tarifga AI Skan qiymatini (masalan 5) qo'shing, aks holda bepul userlar skan qila olmaydi.",
    };
  if (s.freeUnlimited)
    return {
      tone: "info",
      title: "Free tarifda AI skan cheksiz",
      text: "Bepul userlar ham limitsiz skan qiladi — limit hisoblanmaydi.",
    };
  return null;
});

const freeLimitText = computed(() => {
  const s = summary.value;
  if (!s) return "—";
  return s.freeUnlimited ? "Cheksiz" : `${s.freeLimit} ta`;
});

// ── Taqsimot: Free userlar nechta bepul skan ishlatgan ─────────────
const distribution = computed(() => {
  const s = summary.value;
  if (!s) return [];
  const cap = !s.freeUnlimited && s.freeLimit > 0 && s.freeLimit <= 20 ? s.freeLimit : 10;
  const buckets: { key: string; label: string; users: number; tone: string }[] = [];
  for (let used = 0; used <= cap; used++) {
    const users = s.distribution.find((d) => d.used === used)?.users ?? 0;
    const atLimit = cap === s.freeLimit && used === cap;
    buckets.push({
      key: String(used),
      label: atLimit ? `${used} ta · limit` : `${used} ta`,
      users,
      tone: atLimit ? "bad" : used === 0 ? "muted" : "ok",
    });
  }
  const over = s.distribution.filter((d) => d.used > cap).reduce((sum, d) => sum + d.users, 0);
  if (over)
    buckets.push({
      key: "over",
      label: cap === s.freeLimit ? `${cap}+ (bonus bilan)` : `${cap}+ ta`,
      users: over,
      tone: "bonus",
    });
  return buckets;
});

const distributionMax = computed(() => Math.max(1, ...distribution.value.map((b) => b.users)));
const distributionTotal = computed(() => distribution.value.reduce((sum, b) => sum + b.users, 0));

const share = (part: number | undefined, whole: number | undefined) =>
  whole ? (part ?? 0) / whole : 0;

const resultSegments = computed(() => {
  const s = summary.value;
  if (!s || !s.totalScans) return [];
  return [
    { key: "ok", label: "Taom topildi", value: s.successScans },
    { key: "warn", label: "Taom topilmadi", value: s.emptyScans },
    { key: "bad", label: "Xato", value: s.errorScans },
  ].map((x) => ({ ...x, share: x.value / s.totalScans }));
});

// ── Jadval yordamchilari ───────────────────────────────────────────
const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

const usedPercent = (r: AdminScanUserDto) => {
  if (r.unlimited) return 0;
  if (r.limit <= 0) return 100;
  return Math.min(100, Math.round((r.used / r.limit) * 100));
};

const quotaTone = (r: AdminScanUserDto) => {
  if (r.unlimited) return "premium";
  if (r.remaining <= 0) return "bad";
  if (r.remaining <= Math.max(1, Math.round(r.limit * 0.2))) return "warn";
  return "ok";
};

const remainingLabel = (r: AdminScanUserDto) => {
  if (r.unlimited) return r.isPremium ? "Cheksiz · Premium" : "Cheksiz";
  if (r.remaining <= 0) return "Tugagan";
  return `${r.remaining} ta qoldi`;
};

const planLabel = (r: AdminScanUserDto) => (r.isPremium ? r.plan ?? "Premium" : "Free");

// ── Drawer: userning skanlari ──────────────────────────────────────
const drawerOpen = ref(false);
const detail = ref<AdminScanUserDetailDto | null>(null);
const loadingDetail = ref(false);

const openUser = async (userId: number) => {
  drawerOpen.value = true;
  detail.value = null;
  loadingDetail.value = true;
  try {
    detail.value = await aiScanStore.getUser(userId);
  } finally {
    loadingDetail.value = false;
  }
};

const outcomeMeta = (outcome: string) => OUTCOMES[outcome] ?? { label: outcome, tone: "muted" };
const formatDuration = (ms: number | null) => (ms == null ? "" : `${(ms / 1000).toFixed(1)} s`);

// ── CSV (joriy sahifa) ─────────────────────────────────────────────
const exportCsv = () => {
  const header = [
    "User ID", "Ism", "Email", "Telefon", "Tarif", "Free limit", "Bonus", "Jami limit",
    "Ishlatgan (bepul)", "Qolgan", "Jami skan", "Muvaffaqiyatli", "Xato", "Oxirgi skan",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.value.map((r) =>
    [
      r.userId, r.name, r.email, r.phone, planLabel(r), r.freeLimit, r.bonusLimit,
      r.unlimited ? "cheksiz" : r.limit, r.used, r.unlimited ? "cheksiz" : r.remaining,
      r.totalScans, r.successScans, r.errorScans, r.lastScanAt ? formatDateTime(r.lastScanAt) : "",
    ].map(esc).join(","),
  );
  const csv = "﻿" + [header.map(esc).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-skan-limitlari_${status.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">
          <svg-icon icon="navbar/scan.svg" class="title-icon" />
          AI skan limitlari
        </h1>
        <p class="page-sub">
          Har bir userda nechta bepul skan bor, qanchasi ishlatilgan va kim limitga yetgan
        </p>
      </div>
      <ElButton plain :loading="loadingSummary || loadingList" @click="reload">Yangilash</ElButton>
    </header>

    <!-- Free tarif sozlamasi bo'yicha ogohlantirish -->
    <div v-if="configAlert" class="alert" :class="configAlert.tone">
      <div class="min-w-0">
        <p class="alert-title">{{ configAlert.title }}</p>
        <p class="alert-text">{{ configAlert.text }}</p>
      </div>
      <RouterLink :to="{ name: 'subscriptions' }" class="alert-link">Obuna tariflari →</RouterLink>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="app-card kpi">
        <span class="kpi-label">Bepul limit</span>
        <span class="kpi-value" :class="{ bad: configAlert?.tone === 'bad' }">{{ freeLimitText }}</span>
        <span class="kpi-sub">Free tarif har bir userga · Premium cheksiz</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Limiti tugaganlar</span>
        <span class="kpi-value bad">{{ formatNumber(summary?.exhaustedUsers) }}</span>
        <span class="kpi-sub">
          Free userlarning {{ formatPercent(share(summary?.exhaustedUsers, summary?.freeUsers)) }} — skan qila olmaydi
        </span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Bepul skan ishlatganlar</span>
        <span class="kpi-value">{{ formatNumber(summary?.freeUsersScanned) }}</span>
        <span class="kpi-sub">limitdan {{ formatNumber(summary?.freeScansUsed) }} ta skan yechilgan</span>
      </div>
      <div class="app-card kpi">
        <span class="kpi-label">Jami skanlar</span>
        <span class="kpi-value brand">{{ formatNumber(summary?.totalScans) }}</span>
        <span class="kpi-sub">
          bugun {{ formatNumber(summary?.scansToday) }} · {{ formatNumber(summary?.scanners) }} ta user skan qilgan
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <!-- Taqsimot -->
      <section class="app-card panel xl:col-span-3">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Free userlar nechta bepul skan ishlatgan</h2>
            <p class="panel-sub">
              {{ formatNumber(summary?.freeUsers) }} ta Free user · har bir ustun — shuncha skan ishlatgan userlar soni
            </p>
          </div>
        </div>
        <div class="dist">
          <div v-for="b in distribution" :key="b.key" class="dist-row">
            <span class="dist-label">{{ b.label }}</span>
            <div class="dist-track">
              <div
                class="dist-bar"
                :class="b.tone"
                :style="{ width: `${Math.max(b.users ? 2 : 0, (b.users / distributionMax) * 100)}%` }"
              />
            </div>
            <span class="dist-value">
              {{ formatNumber(b.users) }}
              <small>{{ formatPercent(share(b.users, distributionTotal)) }}</small>
            </span>
          </div>
          <p v-if="!distribution.length && !loadingSummary" class="empty-note">Ma'lumot yo'q</p>
        </div>
      </section>

      <!-- Skan natijalari va bonuslar -->
      <section class="app-card panel xl:col-span-2">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Skan natijalari</h2>
            <p class="panel-sub">AI jurnalidagi barcha so'rovlar (Premium ham)</p>
          </div>
        </div>
        <div v-if="resultSegments.length" class="stack">
          <div
            v-for="seg in resultSegments"
            :key="seg.key"
            class="stack-seg"
            :class="seg.key"
            :style="{ width: `${seg.share * 100}%` }"
          />
        </div>
        <ul class="legend">
          <li v-for="seg in resultSegments" :key="seg.key">
            <span class="dot" :class="seg.key" />
            <span class="legend-label">{{ seg.label }}</span>
            <b>{{ formatNumber(seg.value) }}</b>
            <small>{{ formatPercent(seg.share) }}</small>
          </li>
          <li v-if="!resultSegments.length && !loadingSummary" class="empty-note">Hali skan yo'q</li>
        </ul>

        <div class="mini-grid">
          <div class="mini">
            <span class="mini-label">Premium userlar</span>
            <span class="mini-value premium">{{ formatNumber(summary?.premiumUsers) }}</span>
            <span class="mini-sub">cheksiz skan</span>
          </div>
          <div class="mini">
            <span class="mini-label">Bonus olganlar</span>
            <span class="mini-value bonus">{{ formatNumber(summary?.usersWithBonus) }}</span>
            <span class="mini-sub">+{{ formatNumber(summary?.bonusGranted) }} ta skan (do'kondan)</span>
          </div>
        </div>

        <p class="hint">
          Bepul skan faqat Free userda va taom topilgan natijadan keyin yechiladi. Xato yoki "taom topilmadi"
          limitdan yechilmaydi, Premium davridagi skanlar ham hisoblanmaydi — ular faqat "Jami skan"da ko'rinadi.
        </p>
      </section>
    </div>

    <!-- Userlar jadvali -->
    <section class="app-card table-card">
      <div class="tabs">
        <button
          v-for="t in STATUS_TABS"
          :key="t.value"
          class="tab"
          :class="{ active: status === t.value }"
          @click="status = t.value"
        >
          {{ t.label }}
          <span v-if="t.value === 'exhausted' && summary?.exhaustedUsers" class="tab-count">
            {{ formatNumber(summary.exhaustedUsers) }}
          </span>
        </button>
      </div>

      <div class="table-toolbar">
        <div class="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <ElInput
            v-model="search"
            clearable
            placeholder="Ism, email, telefon yoki ID bo'yicha qidirish"
            class="search"
          />
          <ElSelect v-model="sort" class="sort">
            <ElOption v-for="s in SORTS" :key="s.value" :value="s.value" :label="s.label" />
          </ElSelect>
        </div>
        <div class="flex items-center gap-2">
          <span class="total">{{ formatNumber(total) }} ta user</span>
          <ElButton plain :disabled="!rows.length" @click="exportCsv">CSV yuklab olish</ElButton>
        </div>
      </div>

      <div class="table-wrap" v-loading="loadingList">
        <table class="lb">
          <thead>
            <tr>
              <th>Foydalanuvchi</th>
              <th>Tarif</th>
              <th>Bepul skan</th>
              <th class="num">Qolgan</th>
              <th class="num">Bonus</th>
              <th class="num">Jami skan</th>
              <th class="num">Oxirgi skan</th>
              <th class="chev-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.userId" @click="openUser(r.userId)">
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
              <td>
                <span class="plan" :class="{ premium: r.isPremium }">{{ planLabel(r) }}</span>
              </td>
              <td class="quota-col">
                <template v-if="r.unlimited">
                  <span class="quota-text">
                    <b>{{ r.used }}</b> ishlatilgan<span v-if="r.isPremium && r.used" class="muted"> (Free paytida)</span>
                  </span>
                </template>
                <template v-else>
                  <div class="quota-top">
                    <span class="quota-text"><b>{{ r.used }}</b> / {{ r.limit }}</span>
                    <span v-if="r.bonusLimit" class="quota-split">{{ r.freeLimit }} + {{ r.bonusLimit }} bonus</span>
                  </div>
                  <div class="progress">
                    <div class="progress-bar" :class="quotaTone(r)" :style="{ width: `${usedPercent(r)}%` }" />
                  </div>
                </template>
              </td>
              <td class="num">
                <span class="chip" :class="quotaTone(r)">{{ remainingLabel(r) }}</span>
              </td>
              <td class="num">
                <span v-if="r.bonusLimit" class="bonus">+{{ r.bonusLimit }}</span>
                <span v-else class="muted">—</span>
              </td>
              <td class="num">
                <b>{{ formatNumber(r.totalScans) }}</b>
                <span v-if="r.errorScans" class="err" title="Xato bilan tugagan skanlar">{{ r.errorScans }} xato</span>
              </td>
              <td class="num muted nowrap">{{ relativeTime(r.lastScanAt) }}</td>
              <td class="chev-col">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </td>
            </tr>
            <tr v-if="!rows.length && !loadingList">
              <td colspan="8" class="empty">
                {{ search.trim() ? "Qidiruv bo'yicha user topilmadi" : "Bu bo'limda user yo'q" }}
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

    <!-- User skanlari -->
    <ElDrawer v-model="drawerOpen" title="AI skanlari" size="480px" append-to-body :destroy-on-close="true">
      <div v-if="loadingDetail" class="py-16 text-center text-[13px]" style="color: var(--text-faint)">
        Yuklanmoqda...
      </div>

      <div v-else-if="detail" class="drawer">
        <div class="d-head">
          <img v-if="detail.user.photo" :src="makeFileUrl(detail.user.photo)" class="d-avatar" />
          <span v-else class="d-avatar" :style="avatarStyle(detail.user.userId)">{{ initials(detail.user.name) }}</span>
          <div class="min-w-0">
            <p class="d-name">{{ detail.user.name || "—" }}</p>
            <p class="d-sub">
              ID {{ detail.user.userId }}<span v-if="detail.user.phone || detail.user.email"> · {{ detail.user.phone || detail.user.email }}</span>
            </p>
            <p class="d-sub">Ro'yxatdan o'tgan: {{ formatDayYear(detail.user.registeredAt) }}</p>
          </div>
          <span class="plan" :class="{ premium: detail.user.isPremium }">{{ planLabel(detail.user) }}</span>
        </div>

        <div class="d-quota">
          <template v-if="detail.user.unlimited">
            <p class="d-quota-main premium">Cheksiz</p>
            <p class="d-quota-sub">
              <template v-if="detail.user.isPremium">
                Premium<span v-if="detail.user.premiumEndsAt"> · {{ formatDayYear(detail.user.premiumEndsAt) }} gacha</span>
                <span v-if="detail.user.used"> · Free paytida {{ detail.user.used }} ta bepul skan ishlatgan</span>
              </template>
              <template v-else>Free tarifda limit yo'q</template>
            </p>
          </template>
          <template v-else>
            <div class="d-quota-row">
              <p class="d-quota-main">
                {{ detail.user.used }} <small>/ {{ detail.user.limit }} ishlatilgan</small>
              </p>
              <span class="chip" :class="quotaTone(detail.user)">{{ remainingLabel(detail.user) }}</span>
            </div>
            <div class="progress lg">
              <div
                class="progress-bar"
                :class="quotaTone(detail.user)"
                :style="{ width: `${usedPercent(detail.user)}%` }"
              />
            </div>
            <p class="d-quota-sub">
              Free limit {{ detail.user.freeLimit }} ta<span v-if="detail.user.bonusLimit"> + do'kondan {{ detail.user.bonusLimit }} ta bonus</span>
            </p>
          </template>
        </div>

        <div class="d-stats">
          <div>
            <span>Jami skan</span>
            <b>{{ formatNumber(detail.user.totalScans) }}</b>
          </div>
          <div>
            <span>Taom topildi</span>
            <b class="ok-text">{{ formatNumber(detail.user.successScans) }}</b>
          </div>
          <div>
            <span>Xato</span>
            <b :class="{ 'bad-text': detail.user.errorScans }">{{ formatNumber(detail.user.errorScans) }}</b>
          </div>
          <div>
            <span>Oxirgi skan</span>
            <b class="small">{{ relativeTime(detail.user.lastScanAt) }}</b>
          </div>
        </div>

        <div>
          <p class="d-section">
            Skanlar tarixi
            <small v-if="detail.events.length">oxirgi {{ detail.events.length }} ta</small>
          </p>
          <ul v-if="detail.events.length" class="events">
            <li v-for="e in detail.events" :key="e.id" class="event">
              <span class="dot" :class="outcomeMeta(e.outcome).tone" />
              <div class="min-w-0 flex-1">
                <div class="event-top">
                  <span class="event-title">{{ outcomeMeta(e.outcome).label }}</span>
                  <span class="event-time">{{ formatDateTime(e.createdAt) }}</span>
                </div>
                <p class="event-meta">
                  <span v-if="e.itemCount">{{ e.itemCount }} ta taom</span>
                  <span v-if="e.durationMs != null">{{ formatDuration(e.durationMs) }}</span>
                  <span v-if="e.mimeType">{{ e.mimeType }}</span>
                </p>
                <p v-if="e.errorMessage" class="event-error">{{ e.errorMessage }}</p>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Bu user hali skan qilmagan</p>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.title-icon { width: 24px; height: 24px; }
.title-icon :deep(svg) { stroke: var(--brand-strong); stroke-width: 2; fill: none; }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }

.alert {
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  padding: 14px 18px; border-radius: 14px; border: 1px solid;
}
.alert.bad { background: var(--danger-soft); border-color: color-mix(in srgb, var(--danger) 35%, transparent); }
.alert.info { background: var(--info-soft); border-color: color-mix(in srgb, var(--info) 35%, transparent); }
.alert-title { font-weight: 700; font-size: 14px; color: var(--text); }
.alert.bad .alert-title { color: var(--danger); }
.alert-text { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
.alert-link { font-size: 13px; font-weight: 600; color: var(--brand-strong); white-space: nowrap; }

.kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kpi-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); }
.kpi-value { font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.kpi-value.bad { color: var(--danger); }
.kpi-value.brand { color: var(--brand-strong); }
.kpi-sub { font-size: 12px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.panel { padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.panel-title { font-size: 15px; font-weight: 700; color: var(--text); }
.panel-sub { font-size: 12px; color: var(--text-faint); margin-top: 2px; }

.dist { display: flex; flex-direction: column; gap: 8px; }
.dist-row { display: grid; grid-template-columns: 116px minmax(0, 1fr) 96px; align-items: center; gap: 10px; }
.dist-label { font-size: 12.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dist-track { height: 14px; border-radius: 7px; background: var(--surface-2); overflow: hidden; }
.dist-bar { height: 100%; border-radius: 7px; transition: width 0.3s ease; }
.dist-bar.muted { background: color-mix(in srgb, var(--text-faint) 45%, transparent); }
.dist-bar.ok { background: var(--brand-strong); }
.dist-bar.bad { background: var(--danger); }
.dist-bar.bonus { background: var(--purple); }
.dist-value { text-align: right; font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; }
.dist-value small { font-size: 11px; font-weight: 500; color: var(--text-faint); margin-left: 4px; }

.stack { display: flex; height: 12px; border-radius: 6px; overflow: hidden; background: var(--surface-2); }
.stack-seg.ok, .dot.ok { background: var(--success); }
.stack-seg.warn, .dot.warn { background: var(--warning); }
.stack-seg.bad, .dot.bad { background: var(--danger); }
.dot.muted { background: var(--text-faint); }
.legend { display: flex; flex-direction: column; gap: 6px; }
.legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.legend-label { color: var(--text-muted); flex: 1; }
.legend b { color: var(--text); }
.legend small { color: var(--text-faint); width: 48px; text-align: right; }
.dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

.mini-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.mini { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); min-width: 0; }
.mini-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--text-faint); }
.mini-value { font-size: 20px; font-weight: 800; color: var(--text); }
.mini-value.premium { color: var(--purple); }
.mini-value.bonus { color: var(--warning); }
.mini-sub { font-size: 11.5px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hint { font-size: 12px; line-height: 1.5; color: var(--text-faint); padding: 10px 12px; border-radius: 10px; border: 1px dashed var(--border); }
.empty-note { font-size: 13px; color: var(--text-faint); text-align: center; padding: 12px 0; }

/* Jadval */
.table-card { padding: 0; overflow: hidden; }
.tabs { display: flex; gap: 4px; padding: 12px 16px 0; overflow-x: auto; border-bottom: 1px solid var(--border); }
.tab {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px 10px; font-size: 13px; font-weight: 600;
  color: var(--text-faint); border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; cursor: pointer;
}
.tab:hover { color: var(--text); }
.tab.active { color: var(--brand-strong); border-bottom-color: var(--brand-strong); }
.tab-count { padding: 0 7px; border-radius: 999px; font-size: 11px; background: var(--danger-soft); color: var(--danger); }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 14px 16px; }
.search { max-width: 340px; }
.sort { width: 230px; }
.total { font-size: 12.5px; color: var(--text-faint); margin-right: 4px; white-space: nowrap; }
.table-wrap { overflow-x: auto; }
.lb { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 900px; }
.lb th {
  text-align: left; padding: 12px 14px; font-size: 11.5px; font-weight: 600; white-space: nowrap;
  color: var(--text-faint); background: var(--surface-2); text-transform: uppercase; letter-spacing: 0.3px;
}
.lb td { padding: 11px 14px; border-top: 1px solid var(--border); color: var(--text); }
.lb tbody tr { cursor: pointer; transition: background 0.12s ease; }
.lb tbody tr:hover { background: var(--surface-2); }
.lb .num, .lb th.num { text-align: right; }
.muted { color: var(--text-muted) !important; }
.nowrap { white-space: nowrap; }
.chev-col { width: 36px; color: var(--text-faint); }
.chev-col svg { width: 16px; height: 16px; }
.user-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; object-fit: cover;
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12.5px;
}
.user-name { font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
.user-sub { font-size: 12px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }

.plan {
  display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700;
  background: var(--surface-2); color: var(--text-muted); white-space: nowrap;
}
.plan.premium { background: var(--purple-soft); color: var(--purple); }

.quota-col { min-width: 180px; }
.quota-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.quota-text { font-size: 13px; color: var(--text-muted); white-space: nowrap; }
.quota-text b { color: var(--text); font-size: 14px; }
.quota-split { font-size: 11px; color: var(--purple); white-space: nowrap; }
.progress { height: 6px; border-radius: 3px; background: var(--surface-2); overflow: hidden; }
.progress.lg { height: 10px; border-radius: 5px; }
.progress-bar { height: 100%; border-radius: inherit; }
.progress-bar.ok { background: var(--success); }
.progress-bar.warn { background: var(--warning); }
.progress-bar.bad { background: var(--danger); }

.chip { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.chip.ok { background: var(--success-soft); color: var(--success); }
.chip.warn { background: var(--warning-soft); color: var(--warning); }
.chip.bad { background: var(--danger-soft); color: var(--danger); }
.chip.premium { background: var(--purple-soft); color: var(--purple); }
.bonus { color: var(--purple); font-weight: 700; }
.err { margin-left: 6px; font-size: 11.5px; color: var(--danger); white-space: nowrap; }
.empty { text-align: center; color: var(--text-faint); padding: 30px; cursor: default; }
.pager { display: flex; justify-content: flex-end; padding: 14px 16px; border-top: 1px solid var(--border); }

/* Drawer */
.drawer { display: flex; flex-direction: column; gap: 18px; }
.d-head { display: flex; align-items: center; gap: 12px; }
.d-avatar {
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; object-fit: cover;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px;
}
.d-head .min-w-0 { flex: 1; }
.d-name { font-weight: 700; font-size: 16px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-sub { font-size: 12px; color: var(--text-faint); }
.d-quota { padding: 14px 16px; border-radius: 14px; background: var(--surface-2); display: flex; flex-direction: column; gap: 8px; }
.d-quota-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.d-quota-main { font-size: 28px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.d-quota-main small { font-size: 13px; font-weight: 600; color: var(--text-faint); letter-spacing: 0; }
.d-quota-main.premium { color: var(--purple); }
.d-quota-sub { font-size: 12.5px; color: var(--text-muted); }
.d-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.d-stats div { display: flex; flex-direction: column; gap: 2px; padding: 10px; border-radius: 12px; border: 1px solid var(--border); min-width: 0; }
.d-stats span { font-size: 11px; color: var(--text-faint); }
.d-stats b { font-size: 17px; color: var(--text); }
.d-stats b.small { font-size: 12.5px; }
.ok-text { color: var(--success) !important; }
.bad-text { color: var(--danger) !important; }
.d-section { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.d-section small { font-weight: 500; color: var(--text-faint); margin-left: 6px; }
.events { display: flex; flex-direction: column; }
.event { display: flex; gap: 10px; padding: 9px 0; border-top: 1px solid var(--border); }
.event .dot { margin-top: 5px; }
.event-top { display: flex; justify-content: space-between; gap: 8px; }
.event-title { font-size: 13px; font-weight: 600; color: var(--text); }
.event-time { font-size: 12px; color: var(--text-faint); white-space: nowrap; }
.event-meta { display: flex; flex-wrap: wrap; gap: 0 10px; font-size: 11.5px; color: var(--text-faint); }
.event-error { font-size: 11.5px; color: var(--danger); margin-top: 2px; word-break: break-word; }

@media (max-width: 700px) {
  .page-title { font-size: 19px; }
  .search, .sort { max-width: none; width: 100%; }
  .dist-row { grid-template-columns: 84px minmax(0, 1fr) 64px; }
  .dist-value small { display: none; }
  .d-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
