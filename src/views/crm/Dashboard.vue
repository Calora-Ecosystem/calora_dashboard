<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import KpiCard from "./components/KpiCard.vue";
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

const load = async () => {
  const [dash, fus, hot] = await Promise.all([
    crmStore.getMyDashboard(),
    crmStore.getFollowUps("today"),
    crmStore.loadLeads({ skip: 0, take: 6, temperature: "VeryHot", sortPropName: "score", sortDirection: "Descending" }),
  ]);
  stats.value = dash.content;
  todayFollowUps.value = fus.content ?? [];
  hotLeads.value = hot.content ?? [];
};

onMounted(load);

const openLead = (id: number) => router.push({ name: "crm_lead_detail", params: { leadId: id } });

const complete = async (f: FollowUpDto) => {
  await crmStore.completeFollowUp(f.id);
  await load();
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <h1 class="text-[22px] font-extrabold" style="color: var(--text)">Boshqaruv paneli</h1>
      <p class="text-[13px]" style="color: var(--text-faint)">Bugungi ko'rsatkichlaringiz va vazifalaringiz</p>
    </div>

    <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
      <KpiCard label="Mening leadlarim" :value="stats?.myLeads ?? 0" icon="👥" accent="var(--info)" />
      <KpiCard label="Faol leadlar" :value="stats?.activeLeads ?? 0" icon="⚡" accent="var(--brand-strong)" />
      <KpiCard label="Hot leadlar" :value="stats?.hotLeads ?? 0" icon="🔥" accent="var(--danger)" />
      <KpiCard label="Bugungi qo'ng'iroqlar" :value="stats?.todayCalls ?? 0" icon="📞" accent="var(--warning)" />
      <KpiCard label="Bugungi follow-up" :value="stats?.todayFollowUps ?? 0" icon="⏰" accent="#9333ea"
        :hint="(stats?.overdueFollowUps ?? 0) > 0 ? `${stats?.overdueFollowUps} ta kechikkan` : undefined" />
      <KpiCard label="Bugungi sotuvlar" :value="stats?.todaySales ?? 0" icon="✅" accent="var(--success)" />
      <KpiCard label="Bugungi tushum" :value="formatMoney(stats?.todayRevenue ?? 0)" icon="💰" accent="var(--success)" />
      <KpiCard label="Conversion" :value="`${stats?.conversionRate ?? 0}%`" icon="📈" accent="var(--brand-strong)" />
    </div>

    <div class="grid gap-5" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))">
      <section class="app-card p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-[15px]" style="color: var(--text)">Bugungi follow-uplar</h2>
          <button class="link-btn" @click="router.push({ name: 'crm_followups' })">Hammasi →</button>
        </div>
        <div v-if="!todayFollowUps.length" class="empty">Bugun follow-up yo'q 🎉</div>
        <ul v-else class="flex flex-col gap-2">
          <li v-for="f in todayFollowUps" :key="f.id" class="row" :class="{ overdue: f.overdue }">
            <div class="min-w-0 cursor-pointer" @click="openLead(f.leadId)">
              <div class="font-semibold truncate" style="color: var(--text)">{{ f.leadName ?? "Lead #" + f.leadId }}</div>
              <div class="text-[12px]" style="color: var(--text-faint)">
                {{ dueLabel(f.dueAt) }} <span v-if="f.overdue" class="od">kechikkan</span>
              </div>
              <div v-if="f.note" class="text-[12px] mt-0.5" style="color: var(--text-muted)">{{ f.note }}</div>
            </div>
            <button class="done-btn" title="Bajarildi" @click="complete(f)">✓</button>
          </li>
        </ul>
      </section>

      <section class="app-card p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-[15px]" style="color: var(--text)">Eng qaynoq leadlar</h2>
          <button class="link-btn" @click="router.push({ name: 'crm_leads' })">Kanban →</button>
        </div>
        <div v-if="!hotLeads.length" class="empty">Hozircha hot lead yo'q</div>
        <ul v-else class="flex flex-col gap-2">
          <li v-for="l in hotLeads" :key="l.id" class="row cursor-pointer" @click="openLead(l.id)">
            <div class="flex items-center gap-3 min-w-0">
              <div class="avatar" :style="{ background: `hsl(${avatarHue(l.id)} 70% 92%)`, color: `hsl(${avatarHue(l.id)} 65% 38%)` }">{{ initials(l.userName) }}</div>
              <div class="min-w-0">
                <div class="font-semibold truncate" style="color: var(--text)">{{ l.userName ?? "Noma'lum" }}</div>
                <div class="text-[12px]" style="color: var(--text-faint)">{{ l.userPhone ?? l.userEmail ?? "—" }}</div>
              </div>
            </div>
            <span class="temp" :style="{ background: TEMP_META[l.temperature].soft, color: TEMP_META[l.temperature].color }">
              {{ TEMP_META[l.temperature].emoji }} {{ l.score }}
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.row.overdue {
  border-color: var(--danger);
  background: var(--danger-soft);
}
.od {
  color: var(--danger);
  font-weight: 700;
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.temp {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.done-btn {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--success-soft);
  color: var(--success);
  font-weight: 800;
  flex-shrink: 0;
}
.link-btn {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-strong);
}
.empty {
  padding: 24px;
  text-align: center;
  color: var(--text-faint);
  font-size: 13px;
}
</style>
