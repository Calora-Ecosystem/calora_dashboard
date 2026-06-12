<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import KpiCard from "./components/KpiCard.vue";
import Icon from "./components/Icon.vue";
import {
  useCrmStore,
  type OperatorDashboardDto,
  type FollowUpDto,
  type LeadDto,
} from "../../stores/crmStore";
import { TEMP_META, dueLabel, initials, avatarHue } from "./crmMeta";
import { formatMoney } from "../../utils/FormatHelper";

const crmStore = useCrmStore();
const router = useRouter();

const stats = ref<OperatorDashboardDto | null>(null);
const todayFollowUps = ref<FollowUpDto[]>([]);
const hotLeads = ref<LeadDto[]>([]);
const loading = ref(true);

const load = async () => {
  loading.value = true;
  try {
    const [dash, fus, hot] = await Promise.all([
      crmStore.getMyDashboard(),
      crmStore.getFollowUps("today"),
      crmStore.loadLeads({ skip: 0, take: 6, temperature: "VeryHot", sortPropName: "score", sortDirection: "Descending" }),
    ]);
    stats.value = dash.content;
    todayFollowUps.value = fus.content ?? [];
    hotLeads.value = hot.content ?? [];
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const openLead = (id: number) => router.push({ name: "crm_lead_detail", params: { leadId: id } });

const complete = async (f: FollowUpDto) => {
  await crmStore.completeFollowUp(f.id);
  await load();
};
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">Boshqaruv paneli</h1>
        <p class="page-sub">Bugungi ko'rsatkichlaringiz va vazifalaringiz</p>
      </div>
      <button class="icon-btn" :disabled="loading" title="Yangilash" @click="load">
        <Icon name="refresh" :size="17" />
      </button>
    </header>

    <section class="kpi-grid">
      <KpiCard label="Mening leadlarim" :value="stats?.myLeads ?? 0" icon="users" accent="var(--info)" />
      <KpiCard label="Faol leadlar" :value="stats?.activeLeads ?? 0" icon="zap" accent="var(--brand-strong)" />
      <KpiCard label="Hot leadlar" :value="stats?.hotLeads ?? 0" icon="flame" accent="var(--danger)" />
      <KpiCard label="Bugungi qo'ng'iroqlar" :value="stats?.todayCalls ?? 0" icon="phone" accent="var(--warning)" />
      <KpiCard label="Bugungi follow-up" :value="stats?.todayFollowUps ?? 0" icon="clock" accent="#9333ea"
        :hint="(stats?.overdueFollowUps ?? 0) > 0 ? `${stats?.overdueFollowUps} ta kechikkan` : undefined" />
      <KpiCard label="Bugungi sotuvlar" :value="stats?.todaySales ?? 0" icon="check-circle" accent="var(--success)" />
      <KpiCard label="Bugungi tushum" :value="formatMoney(stats?.todayRevenue ?? 0)" icon="wallet" accent="var(--success)" />
      <KpiCard label="Conversion" :value="`${stats?.conversionRate ?? 0}%`" icon="trending-up" accent="var(--brand-strong)" />
    </section>

    <section class="two-col">
      <div class="app-card panel">
        <div class="panel-head">
          <h2 class="panel-title"><Icon name="clock" :size="17" /> Bugungi follow-uplar</h2>
          <button class="link-btn" @click="router.push({ name: 'crm_followups' })">
            Hammasi <Icon name="arrow-right" :size="14" />
          </button>
        </div>
        <div v-if="!todayFollowUps.length" class="empty">
          <Icon name="check-circle" :size="26" /><span>Bugun follow-up yo'q</span>
        </div>
        <ul v-else class="rows">
          <li v-for="f in todayFollowUps" :key="f.id" class="row" :class="{ overdue: f.overdue }">
            <div class="min-w-0 grow cursor-pointer" @click="openLead(f.leadId)">
              <div class="row-name">{{ f.leadName ?? "Lead #" + f.leadId }}</div>
              <div class="row-meta">
                <Icon name="clock" :size="12" /> {{ dueLabel(f.dueAt) }}
                <span v-if="f.overdue" class="od">kechikkan</span>
              </div>
              <div v-if="f.note" class="row-note">{{ f.note }}</div>
            </div>
            <button class="done-btn" title="Bajarildi" @click="complete(f)"><Icon name="check" :size="16" /></button>
          </li>
        </ul>
      </div>

      <div class="app-card panel">
        <div class="panel-head">
          <h2 class="panel-title"><Icon name="flame" :size="17" /> Eng qaynoq leadlar</h2>
          <button class="link-btn" @click="router.push({ name: 'crm_leads' })">
            Kanban <Icon name="arrow-right" :size="14" />
          </button>
        </div>
        <div v-if="!hotLeads.length" class="empty">
          <Icon name="flame" :size="26" /><span>Hozircha hot lead yo'q</span>
        </div>
        <ul v-else class="rows">
          <li v-for="l in hotLeads" :key="l.id" class="row cursor-pointer" @click="openLead(l.id)">
            <div class="flex items-center gap-3 min-w-0 grow">
              <div class="avatar" :style="{ background: `hsl(${avatarHue(l.id)} 70% 92%)`, color: `hsl(${avatarHue(l.id)} 65% 38%)` }">{{ initials(l.userName) }}</div>
              <div class="min-w-0">
                <div class="row-name">{{ l.userName ?? "Noma'lum" }}</div>
                <div class="row-meta">{{ l.userPhone ?? l.userEmail ?? "—" }}</div>
              </div>
            </div>
            <span class="temp" :style="{ background: TEMP_META[l.temperature].soft, color: TEMP_META[l.temperature].color }">
              <Icon :name="TEMP_META[l.temperature].icon" :size="13" /> {{ l.score }}
            </span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.icon-btn {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);
  transition: all 0.15s ease;
}
.icon-btn:hover { color: var(--brand-strong); border-color: var(--brand); }
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.two-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}
.panel { padding: 20px; }
.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 14px;
}
.panel-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: var(--text);
}
.panel-title :deep(.crm-icon) { color: var(--brand-strong); }
.link-btn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12.5px; font-weight: 600; color: var(--brand-strong);
}
.rows { display: flex; flex-direction: column; gap: 9px; }
.row {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 13px; border-radius: 12px;
  background: var(--surface-2); border: 1px solid var(--border);
  transition: border-color 0.15s ease, transform 0.1s ease;
}
.row:hover { transform: translateX(2px); }
.row.overdue { border-color: var(--danger); background: var(--danger-soft); }
.row-name { font-size: 13.5px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-meta {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--text-faint); margin-top: 2px;
}
.row-note { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
.od { color: var(--danger); font-weight: 700; }
.avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px;
}
.temp {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 700; padding: 4px 9px;
  border-radius: 999px; white-space: nowrap; flex-shrink: 0;
}
.done-btn {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--success-soft); color: var(--success);
  transition: transform 0.1s ease;
}
.done-btn:hover { transform: scale(1.08); }
.empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 28px; text-align: center; color: var(--text-faint); font-size: 13px;
}
@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .page-title { font-size: 19px; }
}
</style>
