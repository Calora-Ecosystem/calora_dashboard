<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";
import { ElButton, ElPagination, ElSkeleton } from "element-plus";
import { useReferralStore } from "../../stores/referralStore";
import { useThemeStore } from "../../stores/themeStore";
import { makeFileUrl } from "../../integrations/axios";
import type { ReferralRowDto, ReferralStatus, ReferrerDetailDto } from "../../@types/referral";
import CopyText from "../../components/shared/CopyText.vue";
import UserDetailDrawer from "../../components/ui/UserDetailDrawer.vue";
import {
  avatarHue,
  formatDateTime,
  formatDay,
  formatDayYear,
  formatNumber,
  formatSom,
  initials,
  relativeTime,
} from "../coins/coinMeta";
import { STATUS_FILTERS, STATUS_META } from "./referralMeta";

ChartJS.register(Tooltip, Legend, BarElement, BarController, CategoryScale, LinearScale);

const route = useRoute();
const router = useRouter();
const referralStore = useReferralStore();
const themeStore = useThemeStore();

const userId = computed(() => Number(route.params.userId));
const data = ref<ReferrerDetailDto | null>(null);
const loading = ref(true);
const profileOpen = ref(false);

const load = async () => {
  loading.value = true;
  try {
    data.value = await referralStore.getReferrer(userId.value);
  } catch {
    data.value = null;
  } finally {
    loading.value = false;
  }
};

const d = computed(() => data.value);

// ── Do'stlar ────────────────────────────────────────────────────────
const status = ref<ReferralStatus | "">("");
const page = ref(1);
const pageSize = 15;
const friends = ref<ReferralRowDto[]>([]);
const total = ref(0);
const friendsLoading = ref(false);

const loadFriends = async () => {
  friendsLoading.value = true;
  try {
    const res = await referralStore.getReferrals({
      referrerId: userId.value,
      skip: (page.value - 1) * pageSize,
      take: pageSize,
      status: status.value,
    });
    friends.value = res?.content ?? [];
    total.value = res?.total ?? 0;
  } finally {
    friendsLoading.value = false;
  }
};

watch(status, () => {
  page.value = 1;
  loadFriends();
});

watch(userId, (id) => {
  if (!id) return;
  page.value = 1;
  load();
  loadFriends();
});

// ── Grafik (oxirgi 90 kun) ──────────────────────────────────────────
const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const gridColor = ref("#eaecf1");
const tickColor = ref("#94a3b8");
const refreshThemeColors = () => {
  gridColor.value = cssVar("--border") || "#eaecf1";
  tickColor.value = cssVar("--text-faint") || "#94a3b8";
};
watch(() => themeStore.mode, () => setTimeout(refreshThemeColors, 50));

const hasActivity = computed(() =>
  (d.value?.days ?? []).some((x) => x.invited || x.activated || x.codes),
);

const chartData = computed(() => {
  const days = d.value?.days ?? [];
  return {
    labels: days.map((x) => formatDay(x.date)),
    datasets: [
      { label: "Ulashdi", data: days.map((x) => x.codes), backgroundColor: "#d0d5dd", borderRadius: 3, maxBarThickness: 14 },
      { label: "Kod kiritdi", data: days.map((x) => x.invited), backgroundColor: "#2e90fa", borderRadius: 3, maxBarThickness: 14 },
      { label: "Faol bo'ldi", data: days.map((x) => x.activated), backgroundColor: "#7cc243", borderRadius: 3, maxBarThickness: 14 },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: { position: "top" as const, align: "end" as const, labels: { color: tickColor.value, boxWidth: 10, boxHeight: 10, usePointStyle: true } },
    tooltip: {
      callbacks: {
        title: (items: any[]) => {
          const day = d.value?.days[items[0]?.dataIndex ?? 0];
          return day ? formatDayYear(day.date) : "";
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: tickColor.value, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 8 } },
    y: { beginAtZero: true, grid: { color: gridColor.value }, ticks: { color: tickColor.value, font: { size: 11 }, precision: 0 } },
  },
}));

onMounted(() => {
  refreshThemeColors();
  load();
  loadFriends();
});

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

const back = () => router.push({ name: "referrals" });
const openReferrer = (id: number) => router.push({ name: "referrer_detail", params: { userId: id } });
const openCoins = () => router.push({ name: "coin_user", params: { userId: userId.value } });

const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
</script>

<template>
  <div class="page">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <button class="back" @click="back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Do'st taklifi
      </button>
    </div>

    <div v-if="loading && !d" class="app-card p-6"><ElSkeleton :rows="6" animated /></div>
    <div v-else-if="!d" class="app-card p-10 text-center" style="color: var(--text-faint)">Foydalanuvchi topilmadi</div>

    <template v-else>
      <section class="app-card user-head">
        <div class="flex items-center gap-4 min-w-0">
          <img v-if="d.photo" :src="makeFileUrl(d.photo)" class="big-avatar" />
          <span v-else class="big-avatar" :style="avatarStyle(d.userId)">{{ initials(d.name) }}</span>
          <div class="min-w-0">
            <h1 class="user-title">
              {{ d.name || "—" }}
              <span v-if="d.isPremium" class="tag tag-premium">Premium<template v-if="d.premiumEndsAt"> · {{ formatDayYear(d.premiumEndsAt) }} gacha</template></span>
            </h1>
            <div class="user-meta">
              <span>ID #{{ d.userId }}</span>
              <span> · Ro'yxatdan o'tgan {{ formatDayYear(d.registeredAt) }}</span>
              <span v-if="d.referredById">
                · <button class="inline-link" @click="openReferrer(d.referredById!)">{{ d.referredByName || `ID ${d.referredById}` }}</button> taklif qilgan
              </span>
            </div>
            <div class="contacts">
              <span v-if="d.phone" class="contact"><CopyText :text="d.phone" /></span>
              <span v-if="d.email" class="contact"><CopyText :text="d.email" /></span>
              <span v-if="d.latestCode" class="contact code">Oxirgi kod: <CopyText :text="d.latestCode" /></span>
            </div>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <ElButton plain @click="openCoins">Coinlari</ElButton>
          <ElButton plain @click="profileOpen = true">Profil ma'lumotlari</ElButton>
        </div>
      </section>

      <div class="grid grid-cols-2 xl:grid-cols-6 gap-4">
        <div class="app-card kpi">
          <span class="kpi-label">Taklif qildi</span>
          <span class="kpi-value">{{ formatNumber(d.invited) }}</span>
          <span class="kpi-sub">{{ d.firstInviteAt ? `${formatDayYear(d.firstInviteAt)} dan` : "hali yo'q" }}</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Faol</span>
          <span class="kpi-value">{{ formatNumber(d.activated) }} <small>{{ rate(d.activated, d.invited) }}%</small></span>
          <span class="kpi-sub">{{ d.pending }} ta hali faol emas</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">To'lov qildi</span>
          <span class="kpi-value">{{ formatNumber(d.paid) }} <small>{{ rate(d.paid, d.invited) }}%</small></span>
          <span class="kpi-sub">do'stlardan</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Olib kelgan tushum</span>
          <span class="kpi-value money">{{ formatSom(d.revenue) }}</span>
          <span class="kpi-sub">do'stlari to'lagan</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Ulashdi</span>
          <span class="kpi-value">{{ formatNumber(d.codesCreated) }}</span>
          <span class="kpi-sub">{{ d.lastCodeAt ? `oxirgisi ${relativeTime(d.lastCodeAt)}` : "kod yaratmagan" }}</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Oxirgi taklif</span>
          <span class="kpi-value sm">{{ d.lastInviteAt ? relativeTime(d.lastInviteAt) : "—" }}</span>
          <span class="kpi-sub">{{ d.lastInviteAt ? formatDateTime(d.lastInviteAt) : "" }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
        <section class="app-card progress-card">
          <h2 class="section-title">Keyingi Premium</h2>
          <p class="section-sub">Har {{ d.friendsGoal }} faol do'st uchun Premium beriladi</p>
          <div class="dots">
            <span v-for="i in d.friendsGoal" :key="i" class="dot" :class="{ on: i <= d.progressFriends }">{{ i }}</span>
          </div>
          <p class="progress-text">
            <b>{{ d.progressFriends }}/{{ d.friendsGoal }}</b> — yana <b>{{ d.friendsLeft }}</b> ta faol do'st kerak
          </p>
          <h3 class="sub-title">Olingan Premiumlar</h3>
          <ul v-if="d.grants.length" class="grants">
            <li v-for="g in d.grants" :key="g.milestone">
              <span class="g-badge">{{ g.milestone }}</span>
              <span class="flex-1">{{ g.milestone * d.friendsGoal }} ta do'st → <b>{{ g.days }} kun</b></span>
              <span class="faint">{{ formatDayYear(g.createdAt) }}</span>
            </li>
          </ul>
          <p v-else class="faint text-[13px]">Hali Premium olmagan</p>
        </section>

        <section class="app-card chart-card">
          <h2 class="section-title">Oxirgi 90 kun</h2>
          <p class="section-sub">Ulashish, kod kiritish va faollashish</p>
          <div v-if="hasActivity" class="chart-box"><Bar :data="chartData" :options="chartOptions" /></div>
          <div v-else class="chart-empty">Oxirgi 90 kunda faollik yo'q</div>
        </section>
      </div>

      <section class="app-card table-card">
        <div class="table-toolbar">
          <h2 class="section-title">Taklif qilgan do'stlari</h2>
          <div class="seg">
            <button v-for="o in STATUS_FILTERS" :key="o.value" class="seg-btn" :class="{ 'seg-active': status === o.value }" @click="status = o.value">
              {{ o.label }}
            </button>
          </div>
        </div>
        <div class="table-wrap" v-loading="friendsLoading">
          <table class="lb">
            <thead>
              <tr>
                <th>Do'st</th>
                <th>Holat</th>
                <th class="num">Kod kiritdi</th>
                <th class="num">Faol bo'ldi</th>
                <th class="num">To'lov</th>
                <th>Kod</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in friends" :key="f.id">
                <td>
                  <div class="user-cell">
                    <img v-if="f.referredPhoto" :src="makeFileUrl(f.referredPhoto)" class="avatar" />
                    <span v-else class="avatar" :style="avatarStyle(f.referredUserId)">{{ initials(f.referredName) }}</span>
                    <div class="min-w-0">
                      <p class="user-name">
                        {{ f.referredName || "—" }}
                        <span v-if="f.isPremium" class="tag tag-premium">Premium</span>
                        <span v-if="f.referredDeleted" class="tag tag-deleted">o'chirilgan</span>
                      </p>
                      <p class="user-sub">ID {{ f.referredUserId }}<template v-if="f.referredContact"> · {{ f.referredContact }}</template></p>
                    </div>
                  </div>
                </td>
                <td><span class="status" :class="STATUS_META[f.status]?.cls" :title="STATUS_META[f.status]?.hint">{{ STATUS_META[f.status]?.label }}</span></td>
                <td class="num muted nowrap">{{ formatDateTime(f.createdAt) }}</td>
                <td class="num muted nowrap">{{ f.activatedAt ? formatDateTime(f.activatedAt) : "—" }}</td>
                <td class="num nowrap">
                  <template v-if="f.orders"><b>{{ formatSom(f.revenue) }}</b> <span class="faint">· {{ f.orders }} ta</span></template>
                  <span v-else class="faint">—</span>
                </td>
                <td class="mono">{{ f.code || "—" }}</td>
              </tr>
              <tr v-if="!friends.length && !friendsLoading">
                <td colspan="6" class="empty">Do'st topilmadi</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="total > pageSize" class="pager">
          <ElPagination
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="pageSize"
            :current-page="page"
            @current-change="(p: number) => { page = p; loadFriends(); }"
          />
        </div>
      </section>

      <UserDetailDrawer v-model="profileOpen" :user-id="d.userId" />
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.back { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: var(--text-muted); }
.back:hover { color: var(--brand-strong); }
.back svg { width: 16px; height: 16px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text); }
.section-sub { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }
.sub-title { font-size: 13.5px; font-weight: 700; color: var(--text); margin: 18px 0 8px; }
.faint { color: var(--text-faint); }
.muted { color: var(--text-muted); }
.nowrap { white-space: nowrap; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--text-muted); white-space: nowrap; }

.user-head { padding: 20px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.big-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; }
.user-title { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
.user-meta { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }
.inline-link { color: var(--brand-strong); font-weight: 600; }
.inline-link:hover { text-decoration: underline; }
.contacts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.contact { font-size: 12.5px; padding: 3px 10px; border-radius: 999px; background: var(--surface-2); color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; }

.kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kpi-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-faint); }
.kpi-value { font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi-value small { font-size: 13px; font-weight: 700; color: var(--brand-strong); letter-spacing: 0; }
.kpi-value.money { font-size: 20px; }
.kpi-value.sm { font-size: 18px; }
.kpi-sub { font-size: 12px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.progress-card, .chart-card { padding: 18px 20px; }
.dots { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.dot { width: 36px; height: 36px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: var(--text-faint); background: var(--surface-2); border: 1.5px dashed var(--border); }
.dot.on { color: #fff; background: var(--brand); border: 1.5px solid var(--brand-strong); }
.progress-text { margin-top: 12px; font-size: 13px; color: var(--text-muted); }
.progress-text b { color: var(--text); }
.grants { display: flex; flex-direction: column; gap: 6px; }
.grants li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: var(--surface-2); font-size: 13px; color: var(--text); }
.g-badge { width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: var(--brand-strong); background: var(--brand-soft); }
.chart-box { height: 260px; margin-top: 12px; }
.chart-empty { height: 200px; display: flex; align-items: center; justify-content: center; color: var(--text-faint); font-size: 13px; }

.table-card { padding: 0; overflow: hidden; }
.table-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 14px 16px; }
.seg { display: inline-flex; flex-wrap: wrap; padding: 4px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--border); gap: 3px; }
.seg-btn { padding: 6px 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.table-wrap { overflow-x: auto; }
.lb { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 760px; }
.lb th { text-align: left; padding: 12px 14px; font-size: 11.5px; font-weight: 600; white-space: nowrap; color: var(--text-faint); background: var(--surface-2); text-transform: uppercase; letter-spacing: 0.3px; }
.lb td { padding: 10px 14px; border-top: 1px solid var(--border); color: var(--text); }
.lb .num, .lb th.num { text-align: right; }
.user-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; object-fit: cover; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.user-name { font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
.user-sub { font-size: 12px; color: var(--text-faint); white-space: nowrap; }
.tag { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700; vertical-align: middle; }
.tag-premium { color: var(--purple); background: var(--purple-soft); }
.tag-deleted { color: var(--danger); background: var(--danger-soft); }
.status { padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.st-joined { color: var(--info); background: var(--info-soft); }
.st-active { color: var(--success); background: var(--success-soft); }
.st-paid { color: var(--warning); background: var(--warning-soft); }
.empty { text-align: center; color: var(--text-faint); padding: 30px; }
.pager { display: flex; justify-content: flex-end; padding: 14px 16px; border-top: 1px solid var(--border); }

@media (max-width: 700px) {
  .user-title { font-size: 17px; }
  .kpi-value { font-size: 22px; }
}
</style>
