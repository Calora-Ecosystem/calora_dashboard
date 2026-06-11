<script setup lang="ts">
import { ElPopconfirm } from "element-plus";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Card from "../../components/ui/Card.vue";
import {
  useBillingStore,
  type PlanExtraDto,
  type SubscriptionPlan,
} from "../../stores/billingStore";
import { formatMoney } from "../../utils/FormatHelper";

const billingStore = useBillingStore();
const router = useRouter();

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

const handleDelete = async (id: number) => {
  await billingStore.deletePlan(id);
  await load();
};
</script>

<template>
  <Card title="Obuna tariflari" subtitle="Foydalanuvchilar sotib oladigan tarif paketlari">
    <template #actions>
      <RouterLink :to="{ name: 'subscription_create' }">
        <button class="btn-primary">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi tarif
        </button>
      </RouterLink>
    </template>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="skel-card" />
    </div>

    <!-- Empty -->
    <div v-else-if="!plans.length" class="app-card flex flex-col items-center justify-center py-16 text-center" style="border:1px dashed var(--border); background: var(--surface-2)">
      <h3 class="text-[15px] font-semibold" style="color: var(--text)">Tarif yo'q</h3>
      <p class="text-[13px] mt-1" style="color: var(--text-faint)">Birinchi tarifni qo'shing</p>
    </div>

    <!-- Plan cards -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="p in plans" :key="p.id" class="plan-card" :class="{ 'is-inactive': !p.isActive }">
        <div class="flex items-center justify-between">
          <span class="badge" :style="{ background: planStyle(p.plan).bg, color: planStyle(p.plan).color }">{{ p.plan }}</span>
          <div class="flex items-center gap-1.5">
            <span v-if="p.isPopular" class="mini-badge" style="background: var(--warning-soft); color: var(--warning)">★ Mashhur</span>
            <span class="mini-badge" :style="p.isActive
              ? { background: 'var(--brand-soft)', color: 'var(--brand-strong)' }
              : { background: 'var(--danger-soft)', color: 'var(--danger)' }">
              {{ p.isActive ? "Faol" : "Faol emas" }}
            </span>
          </div>
        </div>

        <div class="mt-3 flex items-baseline gap-1">
          <span class="text-[26px] font-extrabold" style="color: var(--text)">{{ p.duration }}</span>
          <span class="text-[14px] font-semibold" style="color: var(--text-muted)">oy</span>
        </div>

        <div class="mt-1 flex items-baseline gap-2 flex-wrap">
          <span class="text-[17px] font-bold" style="color: var(--brand-strong)">{{ formatMoney(p.fee, "standard") }}</span>
          <span v-if="p.originalFee > p.fee" class="text-[13px] line-through" style="color: var(--text-faint)">{{ formatMoney(p.originalFee, "standard") }}</span>
        </div>

        <div class="mt-4 pt-3 flex items-center gap-2" style="border-top: 1px solid var(--border)">
          <button class="act-btn" @click="router.push({ name: 'subscription_edit', params: { planId: p.id } })">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            Tahrirlash
          </button>
          <ElPopconfirm title="Tarifni o'chirasizmi?" confirm-button-text="Ha" cancel-button-text="Yo'q" @confirm="handleDelete(p.id)">
            <template #reference>
              <button class="act-btn act-danger">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                O'chirish
              </button>
            </template>
          </ElPopconfirm>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 4px 12px rgba(var(--brand-rgb), 0.3);
  transition: all 0.15s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
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
.plan-card.is-inactive {
  opacity: 0.65;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
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
.act-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 34px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  transition: all 0.15s ease;
}
.act-btn:hover {
  filter: brightness(0.96);
}
.act-danger {
  color: var(--danger);
  background: var(--danger-soft);
}
.skel-card {
  height: 168px;
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
