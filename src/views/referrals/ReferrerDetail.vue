<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton, ElOption, ElPagination, ElSelect, ElSkeleton } from "element-plus";
import { useReferralStore } from "../../stores/referralStore";
import { makeFileUrl } from "../../integrations/axios";
import type { ReferralRowDto, ReferralStatus, ReferrerDetailDto } from "../../@types/referral";
import { useIsMobile } from "../../composables/useIsMobile";
import CopyText from "../../components/shared/CopyText.vue";
import UserDetailDrawer from "../../components/ui/UserDetailDrawer.vue";
import { avatarHue, formatDateTime, formatDayYear, formatNumber, formatSom, initials } from "../coins/coinMeta";
import { STATUS_FILTERS, STATUS_META } from "./referralMeta";

const route = useRoute();
const router = useRouter();
const referralStore = useReferralStore();
const isMobile = useIsMobile();

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

onMounted(() => {
  load();
  loadFriends();
});

const avatarStyle = (id: number) => ({
  background: `hsl(${avatarHue(id)} 70% 92%)`,
  color: `hsl(${avatarHue(id)} 65% 38%)`,
});

const back = () => router.push({ name: "referrals" });
const openReferrer = (id: number) => router.push({ name: "referrer_detail", params: { userId: id } });
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
</script>

<template>
  <div class="page">
    <header class="page-head">
      <button class="back" @click="back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Do'st taklifi
      </button>
    </header>

    <div v-if="loading && !d" class="app-card box-pad"><ElSkeleton :rows="5" animated /></div>
    <div v-else-if="!d" class="app-card box-pad empty">Foydalanuvchi topilmadi</div>

    <template v-else>
      <section class="app-card box-pad person">
        <img v-if="d.photo" :src="makeFileUrl(d.photo)" class="big-avatar" />
        <span v-else class="big-avatar" :style="avatarStyle(d.userId)">{{ initials(d.name) }}</span>
        <div class="min-w-0 flex-1">
          <h1 class="p-name">
            {{ d.name || "—" }}
            <span v-if="d.isPremium" class="chip c-purple">Premium</span>
          </h1>
          <p class="p-sub">
            <span>ID {{ d.userId }}</span>
            <span v-if="d.phone"> · <CopyText :text="d.phone" /></span>
            <span v-else-if="d.email"> · <CopyText :text="d.email" /></span>
          </p>
          <p v-if="d.referredById" class="p-sub">
            Taklif qilgan: <button class="link" @click="openReferrer(d.referredById!)">{{ d.referredByName || `ID ${d.referredById}` }}</button>
          </p>
        </div>
        <ElButton size="small" plain @click="profileOpen = true">Profil</ElButton>
      </section>

      <div class="kpis">
        <div class="app-card kpi">
          <span class="kpi-label">Taklif qildi</span>
          <span class="kpi-value">{{ formatNumber(d.invited) }}</span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Faol</span>
          <span class="kpi-value">{{ formatNumber(d.activated) }}<small>{{ pct(d.activated, d.invited) }}%</small></span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">To'lov qildi</span>
          <span class="kpi-value">{{ formatNumber(d.paid) }}<small>{{ pct(d.paid, d.invited) }}%</small></span>
        </div>
        <div class="app-card kpi">
          <span class="kpi-label">Tushum</span>
          <span class="kpi-value money">{{ formatSom(d.revenue) }}</span>
        </div>
      </div>

      <section class="app-card box-pad premium">
        <span class="kpi-label">Keyingi Premium</span>
        <div class="dots">
          <span v-for="i in d.friendsGoal" :key="i" class="dot" :class="{ on: i <= d.progressFriends }" />
        </div>
        <span class="muted text-[13px]"><b>{{ d.progressFriends }}/{{ d.friendsGoal }}</b> · yana {{ d.friendsLeft }} ta</span>
        <span v-if="d.grants.length" class="chip c-green">{{ d.grants.length }}× olgan · {{ d.grants.reduce((a, g) => a + g.days, 0) }} kun</span>
      </section>

      <section class="app-card box">
        <div class="box-head">
          <h2 class="box-title">Do'stlari</h2>
          <ElSelect v-model="status" class="sel">
            <ElOption v-for="o in STATUS_FILTERS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </div>
        <div class="tbl-wrap" v-loading="friendsLoading">
          <table class="tbl">
            <tbody>
              <tr v-for="f in friends" :key="f.id">
                <td>
                  <div class="user">
                    <img v-if="f.referredPhoto" :src="makeFileUrl(f.referredPhoto)" class="avatar" />
                    <span v-else class="avatar" :style="avatarStyle(f.referredUserId)">{{ initials(f.referredName) }}</span>
                    <div class="min-w-0">
                      <p class="u-name">{{ f.referredName || "—" }}</p>
                      <p class="u-sub">{{ formatDateTime(f.createdAt) }}</p>
                    </div>
                  </div>
                </td>
                <td class="hide-sm faint">{{ f.referredContact || "" }}</td>
                <td class="num">
                  <span class="chip" :class="STATUS_META[f.status]?.cls">{{ STATUS_META[f.status]?.label }}</span>
                  <p v-if="f.orders" class="u-sub nowrap">{{ formatSom(f.revenue) }}</p>
                </td>
              </tr>
              <tr v-if="!friends.length && !friendsLoading">
                <td colspan="3" class="empty">Do'st yo'q</td>
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
            @current-change="(p: number) => { page = p; loadFriends(); }"
          />
        </div>
      </section>

      <p v-if="d.firstInviteAt" class="faint text-[12px]">
        Birinchi taklif {{ formatDayYear(d.firstInviteAt) }} · {{ formatNumber(d.codesCreated) }} marta ulashgan
      </p>

      <UserDetailDrawer v-model="profileOpen" :user-id="d.userId" />
    </template>
  </div>
</template>

<style scoped src="../coins/admin.css"></style>
<style scoped>
.person { display: flex; align-items: center; gap: 12px; }
.big-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800; }
.p-name { font-size: 17px; font-weight: 800; color: var(--text); display: flex; align-items: center; gap: 8px; }
.p-sub { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }
.link { color: var(--brand-strong); font-weight: 600; }
.kpi-value.money { font-size: 18px; }
.premium { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dots { display: flex; gap: 6px; }
.dot { width: 14px; height: 14px; border-radius: 50%; background: var(--surface-2); border: 1.5px solid var(--border); }
.dot.on { background: var(--brand); border-color: var(--brand-strong); }
.sel { width: 150px; }
.st-joined { color: var(--info); background: var(--info-soft); }
.st-active { color: var(--success); background: var(--success-soft); }
.st-paid { color: var(--warning); background: var(--warning-soft); }
@media (max-width: 640px) {
  .kpi-value.money { font-size: 15px; }
  .sel { width: 130px; }
}
</style>
