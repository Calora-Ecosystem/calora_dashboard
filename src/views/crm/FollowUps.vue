<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useCrmStore, type FollowUpDto } from "../../stores/crmStore";
import { dueLabel } from "./crmMeta";

const crmStore = useCrmStore();
const router = useRouter();

type Scope = "today" | "overdue" | "upcoming";
const scope = ref<Scope>("today");
const items = ref<FollowUpDto[]>([]);

const tabs: { key: Scope; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "overdue", label: "Kechikkan" },
  { key: "upcoming", label: "Kelgusi" },
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
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="text-[22px] font-extrabold" style="color: var(--text)">Follow-uplar</h1>
      <p class="text-[13px]" style="color: var(--text-faint)">Hech bir lead esdan chiqmasin</p>
    </div>

    <div class="seg">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="seg-btn"
        :class="{ 'seg-active': scope === t.key }"
        @click="setScope(t.key)"
      >{{ t.label }}</button>
    </div>

    <div v-if="!items.length" class="app-card empty">Bu bo'limda follow-up yo'q 🎉</div>
    <ul v-else class="flex flex-col gap-2">
      <li v-for="f in items" :key="f.id" class="app-card row" :class="{ overdue: f.overdue }">
        <div class="min-w-0 cursor-pointer" @click="openLead(f.leadId)">
          <div class="font-bold" style="color: var(--text)">{{ f.leadName ?? "Lead #" + f.leadId }}</div>
          <div class="text-[12.5px]" style="color: var(--text-muted)">{{ f.leadPhone ?? "—" }}</div>
          <div class="text-[12.5px] mt-0.5">
            <span :style="{ color: f.overdue ? 'var(--danger)' : 'var(--text-faint)' }">⏰ {{ dueLabel(f.dueAt) }}</span>
            <span v-if="f.overdue" class="od">kechikkan</span>
          </div>
          <div v-if="f.note" class="text-[12.5px] mt-1" style="color: var(--text-muted)">{{ f.note }}</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="ghost" @click="openLead(f.leadId)">Ochish</button>
          <button class="done" @click="complete(f)">✓ Bajarildi</button>
        </div>
      </li>
    </ul>
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
  align-self: flex-start;
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
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}
.row.overdue {
  border-color: var(--danger);
}
.od {
  color: var(--danger);
  font-weight: 700;
  margin-left: 6px;
}
.ghost {
  height: 34px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.done {
  height: 34px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  background: var(--success);
}
.empty {
  padding: 36px;
  text-align: center;
  color: var(--text-faint);
  font-size: 14px;
}
</style>
