<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import Icon from "./components/Icon.vue";
import { useCrmStore, type FollowUpDto } from "../../stores/crmStore";
import { dueLabel } from "./crmMeta";

const crmStore = useCrmStore();
const router = useRouter();

type Scope = "today" | "overdue" | "upcoming";
const scope = ref<Scope>("today");
const items = ref<FollowUpDto[]>([]);

const tabs: { key: Scope; label: string; icon: string }[] = [
  { key: "today", label: "Bugun", icon: "calendar" },
  { key: "overdue", label: "Kechikkan", icon: "alert-triangle" },
  { key: "upcoming", label: "Kelgusi", icon: "clock" },
];

const load = async () => {
  const res = await crmStore.getFollowUps(scope.value);
  items.value = res.content ?? [];
};

onMounted(load);

const setScope = (s: Scope) => {
  scope.value = s;
  load();
};

const complete = async (f: FollowUpDto) => {
  await crmStore.completeFollowUp(f.id);
  ElMessage.success("Bajarildi");
  await load();
};

const openLead = (id: number) => router.push({ name: "crm_lead_detail", params: { leadId: id } });
</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title"><Icon name="clock" :size="22" /> Follow-uplar</h1>
      <p class="page-sub">Hech bir lead esdan chiqmasin</p>
    </header>

    <div class="seg">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="seg-btn"
        :class="{ 'seg-active': scope === t.key }"
        @click="setScope(t.key)"
      ><Icon :name="t.icon" :size="15" /> {{ t.label }}</button>
    </div>

    <div v-if="!items.length" class="app-card empty">
      <Icon name="check-circle" :size="30" /><span>Bu bo'limda follow-up yo'q</span>
    </div>
    <ul v-else class="list">
      <li v-for="f in items" :key="f.id" class="app-card row" :class="{ overdue: f.overdue }">
        <div class="min-w-0 grow cursor-pointer" @click="openLead(f.leadId)">
          <div class="row-name">{{ f.leadName ?? "Lead #" + f.leadId }}</div>
          <div class="row-phone"><Icon name="phone" :size="12" /> {{ f.leadPhone ?? "—" }}</div>
          <div class="row-due">
            <span class="due" :class="{ od: f.overdue }"><Icon name="clock" :size="13" /> {{ dueLabel(f.dueAt) }}</span>
            <span v-if="f.overdue" class="od-tag">kechikkan</span>
          </div>
          <div v-if="f.note" class="row-note">{{ f.note }}</div>
        </div>
        <div class="acts">
          <button class="ghost" @click="openLead(f.leadId)">Ochish</button>
          <button class="done" @click="complete(f)"><Icon name="check" :size="15" /> Bajarildi</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.page-title :deep(.crm-icon) { color: var(--brand-strong); }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.seg {
  display: inline-flex; padding: 4px; border-radius: 12px;
  background: var(--surface-2); border: 1px solid var(--border);
  gap: 3px; align-self: flex-start; flex-wrap: wrap;
}
.seg-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 15px; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--text-muted);
  transition: all 0.15s ease;
}
.seg-active { background: var(--surface); color: var(--brand-strong); box-shadow: var(--shadow-sm); }
.list { display: flex; flex-direction: column; gap: 10px; }
.row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; padding: 15px 17px; transition: border-color 0.15s ease;
}
.row.overdue { border-color: var(--danger); }
.row-name { font-size: 14.5px; font-weight: 700; color: var(--text); }
.row-phone { display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text-muted); margin-top: 3px; }
.row-due { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.due { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text-faint); }
.due.od { color: var(--danger); font-weight: 600; }
.od-tag { font-size: 11px; font-weight: 700; color: var(--danger); background: var(--danger-soft); padding: 1px 8px; border-radius: 999px; }
.row-note { font-size: 12.5px; color: var(--text-muted); margin-top: 6px; }
.acts { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.ghost {
  height: 36px; padding: 0 14px; border-radius: 10px; font-size: 12.5px; font-weight: 600;
  color: var(--text-muted); background: var(--surface-2); border: 1px solid var(--border);
}
.done {
  display: inline-flex; align-items: center; gap: 5px;
  height: 36px; padding: 0 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700;
  color: #fff; background: var(--success);
}
.empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px; text-align: center; color: var(--text-faint); font-size: 14px;
}
@media (max-width: 560px) {
  .row { flex-direction: column; align-items: stretch; }
  .acts { justify-content: flex-end; }
  .page-title { font-size: 19px; }
}
</style>
