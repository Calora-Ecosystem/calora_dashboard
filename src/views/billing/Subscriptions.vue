<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Card from "../../components/ui/Card.vue";
import {
  useBillingStore,
  type PlanExtraDto,
  type SubscriptionPlan,
} from "../../stores/billingStore";
import { formatMoney } from "../../utils/FormatHelper";

const billingStore = useBillingStore();

const plans = ref<PlanExtraDto[]>([]);
const loading = ref(true);

const load = async () => {
  loading.value = true;
  try {
    plans.value = await billingStore.loadPlans();
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const planStyle = (plan: SubscriptionPlan) => {
  switch (plan) {
    case "Premium":
      return { bg: "var(--brand-soft)", color: "var(--brand-strong)" };
    case "Pro":
      return { bg: "var(--warning-soft)", color: "var(--warning)" };
    default:
      return { bg: "var(--surface-2)", color: "var(--text-muted)" };
  }
};

// Tariflarni plan turi bo'yicha guruhlash
const grouped = computed(() => {
  const order: SubscriptionPlan[] = ["Premium", "Pro", "Free"];
  const map = new Map<SubscriptionPlan, PlanExtraDto[]>();
  for (const p of plans.value) {
    if (!map.has(p.plan)) map.set(p.plan, []);
    map.get(p.plan)!.push(p);
  }
  return order
    .filter((pl) => map.has(pl))
    .map((pl) => ({ plan: pl, items: map.get(pl)! }));
});
</script>

<template>
  <Card title="Obuna tariflari" subtitle="Ilovadagi obuna paketlari (real ma'lumot)">
    <template #actions>
      <button class="btn-ghost" :disabled="loading" @click="load">
        <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Yangilash
      </button>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="skel-card" />
    </div>

    <!-- Empty -->
    <div v-else-if="!plans.length" class="flex flex-col items-center justify-center py-16 text-center rounded-2xl" style="border:1px dashed var(--border); background: var(--surface-2)">
      <svg class="w-10 h-10 mb-3" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
      <h3 class="text-[15px] font-semibold" style="color: var(--text)">Tarif topilmadi</h3>
      <p class="text-[13px] mt-1" style="color: var(--text-faint)">Hozircha faol obuna paketlari yo'q</p>
    </div>

    <!-- Grouped plans -->
    <div v-else class="space-y-7">
      <div v-for="group in grouped" :key="group.plan">
        <div class="flex items-center gap-2.5 mb-3">
          <span class="badge" :style="{ background: planStyle(group.plan).bg, color: planStyle(group.plan).color }">{{ group.plan }}</span>
          <span class="text-[12.5px]" style="color: var(--text-faint)">{{ group.items.length }} ta paket</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="p in group.items" :key="p.id" class="plan-card" :class="{ 'is-popular': p.isPopular }">
            <div class="flex items-center justify-between">
              <div class="flex items-baseline gap-1">
                <span class="text-[26px] font-extrabold" style="color: var(--text)">{{ p.duration }}</span>
                <span class="text-[14px] font-semibold" style="color: var(--text-muted)">oy</span>
              </div>
              <span v-if="p.isPopular" class="mini-badge" style="background: var(--warning-soft); color: var(--warning)">★ Mashhur</span>
            </div>

            <div class="mt-3 flex items-baseline gap-2 flex-wrap">
              <span class="text-[19px] font-bold" style="color: var(--brand-strong)">{{ formatMoney(p.fee, "standard") }}</span>
              <span v-if="p.originalFee > p.fee" class="text-[13px] line-through" style="color: var(--text-faint)">{{ formatMoney(p.originalFee, "standard") }}</span>
            </div>

            <div v-if="p.originalFee > p.fee" class="mt-1">
              <span class="save-chip">-{{ Math.round((1 - p.fee / p.originalFee) * 100) }}%</span>
            </div>

            <div class="mt-4 pt-3 flex items-center justify-between text-[12px]" style="border-top: 1px solid var(--border); color: var(--text-faint)">
              <span>ID: {{ p.id }}</span>
              <span class="dot" :class="p.isActive ? 'dot-on' : 'dot-off'">{{ p.isActive ? "Faol" : "Faol emas" }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.btn-ghost:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-hover);
}
.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.plan-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}
.plan-card:hover {
  border-color: var(--brand);
  transform: translateY(-2px);
}
.plan-card.is-popular {
  border-color: var(--warning);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
}
.mini-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.save-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--brand-soft);
  color: var(--brand-strong);
}
.dot {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
}
.dot::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot-on { color: var(--brand-strong); }
.dot-on::before { background: var(--brand); }
.dot-off { color: var(--danger); }
.dot-off::before { background: var(--danger); }
.skel-card {
  height: 150px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-hover) 37%, var(--surface-2) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
