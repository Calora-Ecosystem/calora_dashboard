<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  ElDialog,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElPopconfirm,
  ElRadio,
  ElRadioGroup,
  ElSwitch,
} from "element-plus";
import Card from "../../components/ui/Card.vue";
import {
  useBillingStore,
  type CreateOrUpdatePlanExtraDto,
  type PlanExtraDto,
  type PlanFeatureDefinitionDto,
  type PlanFeatureDto,
  type SubscriptionPlan,
} from "../../stores/billingStore";
import { formatMoney } from "../../utils/FormatHelper";

const billingStore = useBillingStore();

const plans = ref<PlanExtraDto[]>([]);
const featureDefs = ref<PlanFeatureDefinitionDto[]>([]);
const loading = ref(true);

const load = async () => {
  loading.value = true;
  try {
    const [plansRes, featsRes] = await Promise.allSettled([
      billingStore.loadPlans(),
      billingStore.loadPlanFeatures(),
    ]);

    if (plansRes.status === "fulfilled") {
      plans.value = plansRes.value;
    }
    if (featsRes.status === "fulfilled" && featsRes.value.length) {
      featureDefs.value = featsRes.value;
    } else {
      featureDefs.value = [
        {
          featureKey: "AiScans",
          name: "AI Scans",
          description: "AI food recognition limit (e.g. number count or 'unlimited')",
        },
      ];
    }
  } finally {
    loading.value = false;
  }
};
onMounted(load);

// ─── Plan uslublari va ma'lumotlari ──────────────────────────────
const planConfig: Record<
  SubscriptionPlan,
  { label: string; badge: string; hint: string; bg: string; color: string; dot: string }
> = {
  Premium: {
    label: "Premium",
    badge: "Premium",
    hint: "Standart individual premium obuna",
    bg: "var(--brand-soft)",
    color: "var(--brand-strong)",
    dot: "var(--brand)",
  },
  Family: {
    label: "Oilaviy (Family)",
    badge: "Oilaviy · 2 kishi",
    hint: "2 kishi: xaridor + 1 a'zo uchun 100% kupon",
    bg: "var(--info-soft)",
    color: "var(--info)",
    dot: "#0ba5ec",
  },
  Pro: {
    label: "Pro",
    badge: "Pro",
    hint: "Kengaytirilgan imkoniyatlarga ega paketlar",
    bg: "var(--purple-soft, #f4ebff)",
    color: "var(--purple, #7a5af8)",
    dot: "#7a5af8",
  },
  Free: {
    label: "Free (Bepul)",
    badge: "Free",
    hint: "Bepul foydalanuvchilar uchun standart parametrlar",
    bg: "var(--surface-2)",
    color: "var(--text-muted)",
    dot: "#94a3b8",
  },
};

const planStyle = (plan: SubscriptionPlan) => {
  return planConfig[plan] ?? {
    label: plan,
    badge: plan,
    hint: "",
    bg: "var(--surface-2)",
    color: "var(--text-muted)",
    dot: "#94a3b8",
  };
};

const featureDisplayName = (key: string) => {
  if (key === "AiScans") return "AI Skan";
  const found = featureDefs.value.find((f) => f.featureKey.toLowerCase() === key.toLowerCase());
  return found?.name || key;
};

const formatFeatureDisplay = (val: string) => {
  if (!val) return "—";
  if (val.trim().toLowerCase() === "unlimited") return "Cheksiz";
  if (/^\d+$/.test(val.trim())) return `${val} ta`;
  return val;
};

// Guruhlangan tariflar
const grouped = computed(() => {
  const order: SubscriptionPlan[] = ["Premium", "Family", "Pro", "Free"];
  const allKnown = [...new Set([...order, ...plans.value.map((p) => p.plan)])];
  const groups: {
    key: string;
    plan: SubscriptionPlan;
    title: string;
    subtitle: string;
    items: PlanExtraDto[];
  }[] = [];

  for (const plan of allKnown) {
    const items = plans.value.filter((p) => p.plan === plan);
    if (!items.length) continue;

    let title = plan as string;
    let subtitle = "";
    if (plan === "Premium") {
      title = "Premium tariflar";
      subtitle = "Ilovadagi standart individual obuna paketlari";
    } else if (plan === "Family") {
      title = "Oilaviy (Family) tariflar";
      subtitle = "2 kishi uchun paket — xarid qilgan foydalanuvchi va ikkinchi a'zo uchun 100% kupon";
    } else if (plan === "Pro") {
      title = "Pro tariflar";
      subtitle = "Kengaytirilgan imkoniyatlarga ega paketlar";
    } else if (plan === "Free") {
      title = "Free (Bepul) tarif";
      subtitle = "Barcha ro'yxatdan o'tgan foydalanuvchilar uchun standart limitlar";
    }

    groups.push({ key: plan, plan, title, subtitle, items });
  }

  return groups;
});

// ─── Modal formasi ────────────────────────────────────────────────
type FormFeatureItem = {
  featureKey: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  mode: "unlimited" | "custom";
  count: number;
  isCustom?: boolean;
};

interface FormState {
  id?: number;
  plan: SubscriptionPlan;
  duration: number;
  fee: number;
  originalFee: number;
  isActive: boolean;
  isPopular: boolean;
  features: FormFeatureItem[];
}

const dialogOpen = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);

// Modalka ochilganda orqa fon (main konteyner) scroll bo'lishini to'xtatish
watch(dialogOpen, (open) => {
  const mainEl = document.querySelector("main");
  if (mainEl) {
    if (open) {
      mainEl.style.overflow = "hidden";
    } else {
      mainEl.style.overflow = "";
    }
  }
});

onUnmounted(() => {
  const mainEl = document.querySelector("main");
  if (mainEl) {
    mainEl.style.overflow = "";
  }
});

const defaultFeaturesForPlan = (plan: SubscriptionPlan): FormFeatureItem[] => {
  const defs = featureDefs.value.length
    ? featureDefs.value
    : [
        {
          featureKey: "AiScans",
          name: "AI Scans",
          description: "AI food recognition limit (e.g. number count or 'unlimited')",
        },
      ];

  return defs.map((d) => ({
    featureKey: d.featureKey,
    name: d.name,
    description: d.description,
    enabled: true,
    mode: plan === "Free" ? "custom" : "unlimited",
    count: plan === "Free" ? 5 : 50,
    isCustom: false,
  }));
};

const emptyForm = (): FormState => ({
  plan: "Premium",
  duration: 1,
  fee: 0,
  originalFee: 0,
  isActive: true,
  isPopular: false,
  features: defaultFeaturesForPlan("Premium"),
});

const form = reactive<FormState>(emptyForm());

const selectPlan = (newPlan: SubscriptionPlan) => {
  form.plan = newPlan;
  if (!editingId.value) {
    for (const f of form.features) {
      if (newPlan === "Free") {
        f.mode = "custom";
        if (f.count === 50) f.count = 5;
      } else {
        f.mode = "unlimited";
      }
    }
  }
};

const setDuration = (months: number) => {
  form.duration = months;
};

const addFeeAmount = (amount: number) => {
  form.fee = (form.fee || 0) + amount;
};

const applyDiscountPreset = (percent: number) => {
  if (percent === 0) {
    form.originalFee = 0;
    return;
  }
  if (!form.fee || form.fee <= 0) return;
  // Yangi eski narx: fee / (1 - percent/100) ni eng yaqin 1000 ga yaxlitlash
  const calculated = Math.round(form.fee / (1 - percent / 100) / 1000) * 1000;
  form.originalFee = Math.max(calculated, form.fee + 1000);
};

const addCustomFeature = () => {
  form.features.push({
    featureKey: "",
    name: "",
    description: "Maxsus parametr",
    enabled: true,
    mode: "unlimited",
    count: 10,
    isCustom: true,
  });
};

const removeFeatureItem = (index: number) => {
  form.features.splice(index, 1);
};

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, emptyForm());
  dialogOpen.value = true;
};

const openEdit = (p: PlanExtraDto) => {
  editingId.value = p.id;

  const defs = featureDefs.value.length
    ? featureDefs.value
    : [
        {
          featureKey: "AiScans",
          name: "AI Scans",
          description: "AI food recognition limit (e.g. number count or 'unlimited')",
        },
      ];

  const featuresList: FormFeatureItem[] = defs.map((d) => {
    const existing = p.features?.find(
      (f) => f.featureKey.toLowerCase() === d.featureKey.toLowerCase(),
    );
    if (existing) {
      const isUnlim = existing.value.trim().toLowerCase() === "unlimited";
      return {
        featureKey: d.featureKey,
        name: d.name,
        description: d.description,
        enabled: true,
        mode: isUnlim ? "unlimited" : "custom",
        count: isUnlim ? 50 : parseInt(existing.value) || 0,
        isCustom: false,
      };
    }
    return {
      featureKey: d.featureKey,
      name: d.name,
      description: d.description,
      enabled: false,
      mode: "unlimited",
      count: 50,
      isCustom: false,
    };
  });

  // Agar backendda ro'yxatda bo'lmagan qo'shimcha parametrlar bo'lsa
  for (const ext of p.features || []) {
    if (!featuresList.some((f) => f.featureKey.toLowerCase() === ext.featureKey.toLowerCase())) {
      const isUnlim = ext.value.trim().toLowerCase() === "unlimited";
      featuresList.push({
        featureKey: ext.featureKey,
        name: ext.featureKey,
        description: "",
        enabled: true,
        mode: isUnlim ? "unlimited" : "custom",
        count: isUnlim ? 50 : parseInt(ext.value) || 0,
        isCustom: true,
      });
    }
  }

  Object.assign(form, {
    id: p.id,
    plan: p.plan,
    duration: p.duration,
    fee: p.fee,
    originalFee: p.originalFee,
    isActive: p.isActive,
    isPopular: p.isPopular,
    features: featuresList,
  });

  dialogOpen.value = true;
};

// Chegirma foizi hisoblash
const discountPercent = computed(() => {
  if (!form.originalFee || form.originalFee <= form.fee) return 0;
  return Math.round((1 - form.fee / form.originalFee) * 100);
});

// Bir xil muddatli faol paket mavjudligini tekshirish (backend xatosi oldini olish)
const duplicateActivePlan = computed(() => {
  if (!form.isActive) return null;
  return plans.value.find(
    (p) =>
      p.id !== editingId.value &&
      p.plan === form.plan &&
      p.duration === form.duration &&
      p.isActive,
  );
});

const formError = computed(() => {
  if (!form.duration || form.duration < 1) return "Muddat kamida 1 oy bo'lishi kerak";
  if (form.fee < 0) return "Joriy narx manfiy bo'lishi mumkin emas";
  if (form.originalFee !== 0 && form.originalFee <= form.fee)
    return "Eski narx joriy narxdan katta bo'lishi kerak (yoki 0 — chegirmasiz)";
  if (duplicateActivePlan.value)
    return `${form.plan} tarifida allaqachon faol ${form.duration} oylik paket mavjud (ID: ${duplicateActivePlan.value.id}). Ikkita bir xil muddatli faol paket yaratib bo'lmaydi.`;
  return "";
});

const save = async () => {
  if (formError.value) return;
  saving.value = true;
  try {
    const featuresPayload: PlanFeatureDto[] = form.features
      .filter((f) => f.enabled && f.featureKey.trim())
      .map((f) => ({
        featureKey: f.featureKey.trim(),
        value: f.mode === "unlimited" ? "unlimited" : String(f.count ?? 0),
      }));

    const payload: CreateOrUpdatePlanExtraDto = {
      ...(editingId.value ? { id: editingId.value } : {}),
      plan: form.plan,
      duration: form.duration,
      fee: form.fee,
      originalFee: form.originalFee,
      isActive: form.isActive,
      isPopular: form.isActive ? form.isPopular : false,
      features: featuresPayload,
    };

    const res = await billingStore.modifyPlan(payload);
    if (res.code !== 200) return;
    ElMessage.success(editingId.value ? "Tarif yangilandi" : "Tarif yaratildi");
    dialogOpen.value = false;
    await load();
  } catch {
    // xato bildirishnomasi apiCallStore'da ko'rsatiladi
  } finally {
    saving.value = false;
  }
};

const removePlan = async (p: PlanExtraDto) => {
  try {
    const res = await billingStore.deletePlan(p.id);
    if (res.code !== 200) return;
    ElMessage.success("Tarif o'chirildi");
    await load();
  } catch {
    // sotib olingan tarifni o'chirib bo'lmaydi — backend xato qaytaradi
  }
};

// Kartochkadan tez amallar
const quickToggle = async (p: PlanExtraDto, patch: Partial<CreateOrUpdatePlanExtraDto>) => {
  try {
    const res = await billingStore.modifyPlan({
      id: p.id,
      plan: p.plan,
      duration: p.duration,
      fee: p.fee,
      originalFee: p.originalFee,
      isActive: p.isActive,
      isPopular: p.isPopular,
      features: p.features ? [...p.features] : [],
      ...patch,
    });
    if (res.code !== 200) return;
    await load();
  } catch {
    // xato bildirishnomasi apiCallStore'da ko'rsatiladi
  }
};
</script>

<template>
  <Card title="Obuna tariflari" subtitle="Ilovadagi obuna paketlari va ularning imkoniyatlarini boshqaring">
    <template #actions>
      <div class="flex items-center gap-2">
        <button class="btn-ghost" :disabled="loading" @click="load">
          <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Yangilash
        </button>
        <button class="btn-primary" @click="openCreate">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi tarif
        </button>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="skel-card" />
    </div>

    <!-- Empty -->
    <div v-else-if="!plans.length" class="flex flex-col items-center justify-center py-16 text-center rounded-2xl" style="border:1px dashed var(--border); background: var(--surface-2)">
      <svg class="w-10 h-10 mb-3" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
      <h3 class="text-[15px] font-semibold" style="color: var(--text)">Tarif topilmadi</h3>
      <p class="text-[13px] mt-1" style="color: var(--text-faint)">Birinchi obuna paketini yarating</p>
      <button class="btn-primary mt-4" @click="openCreate">Yangi tarif</button>
    </div>

    <!-- Grouped plans -->
    <div v-else class="space-y-8">
      <div v-for="group in grouped" :key="group.key">
        <div class="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            <span class="badge" :style="{ background: planStyle(group.plan).bg, color: planStyle(group.plan).color }">
              {{ planStyle(group.plan).badge }}
            </span>
            <span class="text-[14px] font-semibold" style="color: var(--text)">{{ group.title }}</span>
            <span class="text-[12px]" style="color: var(--text-faint)">({{ group.items.length }} ta paket)</span>
          </div>
          <span v-if="group.subtitle" class="text-[12px]" style="color: var(--text-muted)">{{ group.subtitle }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="p in group.items" :key="p.id" class="plan-card" :class="{ 'is-popular': p.isPopular, 'is-off': !p.isActive }">
            <div class="flex items-center justify-between">
              <div class="flex items-baseline gap-1">
                <span class="text-[26px] font-extrabold" style="color: var(--text)">{{ p.duration }}</span>
                <span class="text-[14px] font-semibold" style="color: var(--text-muted)">oy</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span v-if="p.plan === 'Family'" class="mini-badge" style="background: var(--info-soft); color: var(--info)">
                  Oilaviy (2 kishi)
                </span>
                <span v-if="p.isPopular" class="mini-badge" style="background: var(--warning-soft); color: var(--warning)">
                  ★ Eng yaxshi taklif
                </span>
              </div>
            </div>

            <!-- Narx -->
            <div class="mt-3 flex items-baseline gap-2 flex-wrap">
              <span class="text-[19px] font-bold" style="color: var(--brand-strong)">
                {{ formatMoney(p.fee, "standard") }}
              </span>
              <span v-if="p.originalFee > p.fee" class="text-[13px] line-through" style="color: var(--text-faint)">
                {{ formatMoney(p.originalFee, "standard") }}
              </span>
            </div>

            <div v-if="p.originalFee > p.fee" class="mt-1">
              <span class="save-chip">-{{ Math.round((1 - p.fee / p.originalFee) * 100) }}% chegirma</span>
            </div>

            <!-- Referral chegirmasi ma'lumoti -->
            <div v-if="p.referralDiscountPercent && p.referralDiscountPercent > 0" class="mt-2 text-[12px] flex items-center gap-1.5" style="color: var(--info)">
              <span class="mini-badge" style="background: var(--info-soft); color: var(--info)">
                Referral: -{{ p.referralDiscountPercent }}%
              </span>
              <span v-if="p.discountedFee" class="font-semibold">
                ({{ formatMoney(p.discountedFee, "standard") }})
              </span>
            </div>

            <!-- Features ro'yxati -->
            <div v-if="p.features && p.features.length" class="mt-3.5 pt-3 space-y-1.5" style="border-top: 1px dashed var(--border)">
              <div class="text-[11px] font-bold uppercase tracking-wider" style="color: var(--text-faint)">
                Imkoniyatlar (Features)
              </div>
              <div class="flex flex-wrap gap-1.5">
                <div
                  v-for="f in p.features"
                  :key="f.featureKey"
                  class="feature-pill"
                >
                  <span class="text-[11.5px]" style="color: var(--text-muted)">{{ featureDisplayName(f.featureKey) }}:</span>
                  <span
                    class="font-semibold text-[11.5px]"
                    :style="{ color: f.value.trim().toLowerCase() === 'unlimited' ? 'var(--brand-strong)' : 'var(--text)' }"
                  >
                    {{ formatFeatureDisplay(f.value) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 flex items-center justify-between text-[12px]" style="border-top: 1px solid var(--border); color: var(--text-faint)">
              <span>ID: {{ p.id }}</span>
              <span class="dot" :class="p.isActive ? 'dot-on' : 'dot-off'">{{ p.isActive ? "Faol" : "Faol emas" }}</span>
            </div>

            <!-- Amallar -->
            <div class="mt-3 flex items-center gap-1.5">
              <button class="icon-act" title="Tahrirlash" style="color: var(--brand-strong); background: var(--brand-soft)" @click="openEdit(p)">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              </button>

              <button
                class="icon-act"
                :title="p.isPopular ? 'Eng yaxshi taklifni olib tashlash' : 'Eng yaxshi taklif qilish'"
                :disabled="!p.isActive"
                :style="p.isPopular
                  ? { color: 'var(--warning)', background: 'var(--warning-soft)' }
                  : { color: 'var(--text-faint)', background: 'var(--surface-2)' }"
                @click="quickToggle(p, { isPopular: !p.isPopular })"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" :fill="p.isPopular ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>

              <button
                class="icon-act"
                :title="p.isActive ? 'Faolsizlantirish' : 'Faollashtirish'"
                :style="p.isActive
                  ? { color: 'var(--warning)', background: 'var(--warning-soft)' }
                  : { color: 'var(--brand-strong)', background: 'var(--brand-soft)' }"
                @click="quickToggle(p, { isActive: !p.isActive, isPopular: p.isActive ? false : p.isPopular })"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
              </button>

              <ElPopconfirm
                title="Tarif butunlay o'chiriladi. Davom etasizmi?"
                confirm-button-text="Ha"
                cancel-button-text="Yo'q"
                @confirm="removePlan(p)"
              >
                <template #reference>
                  <button class="icon-act ml-auto" title="O'chirish" style="color: var(--danger); background: var(--danger-soft)">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </template>
              </ElPopconfirm>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Yangilangan va sozlangan Yaratish / Tahrirlash Modalkasi       -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <ElDialog
      v-model="dialogOpen"
      :title="editingId ? `Tarifni tahrirlash (#${editingId})` : 'Yangi tarif yaratish'"
      width="640px"
      align-center
      append-to-body
      :lock-scroll="true"
      destroy-on-close
      class="plan-dialog"
    >
      <div class="space-y-5">
        <!-- 1. Tarif turi tanlash (Plan Selector) -->
        <div>
          <label class="fld-label">Tarif turi (Plan)</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div
              v-for="(cfg, planKey) in planConfig"
              :key="planKey"
              class="plan-type-btn"
              :class="{ 'is-active': form.plan === planKey }"
              @click="selectPlan(planKey)"
            >
              <div class="flex items-center justify-between">
                <span class="plan-type-name">{{ cfg.label }}</span>
                <span class="plan-type-dot" :style="{ background: cfg.dot }"></span>
              </div>
              <div class="plan-type-hint">{{ cfg.hint }}</div>
            </div>
          </div>
        </div>

        <!-- Oilaviy tarif tanlanganda tushuntirish banneri -->
        <div v-if="form.plan === 'Family'" class="family-notice">
          <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>
            <strong>Oilaviy paket xususiyati:</strong> Ushbu paketni sotib olgan foydalanuvchiga Premium obuna faollashadi va ikkinchi oila a'zosi uchun ushbu muddatga teng 100% chegirmali kupon kodi avtomatik beriladi.
          </div>
        </div>

        <!-- 2. Muddat (Oylar soni) -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="fld-label mb-0">Obuna muddati (oy)</label>
            <!-- Tezkor tugmalar -->
            <div class="flex items-center gap-1">
              <button
                v-for="m in [1, 3, 6, 12]"
                :key="m"
                type="button"
                class="quick-pill"
                :class="{ 'is-active': form.duration === m }"
                @click="setDuration(m)"
              >
                {{ m === 12 ? '1 yil (12 oy)' : `${m} oy` }}
              </button>
            </div>
          </div>
          <ElInputNumber
            v-model="form.duration"
            :min="1"
            :max="120"
            class="w-full"
            controls-position="right"
          />
        </div>

        <!-- 3. Narxlar (Joriy va eski narx) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <!-- Joriy narx -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="fld-label mb-0">Joriy narx (so'm)</label>
              <span class="text-[12px] font-bold" style="color: var(--brand-strong)">
                {{ formatMoney(form.fee || 0, "standard") }}
              </span>
            </div>
            <ElInputNumber
              v-model="form.fee"
              :min="0"
              :step="1000"
              :controls="false"
              class="w-full num-input"
              placeholder="0"
            />
            <!-- Tezkor qo'shish -->
            <div class="flex items-center gap-1 mt-1.5 flex-wrap">
              <button type="button" class="mini-tool-btn" @click="addFeeAmount(10000)">+10 ming</button>
              <button type="button" class="mini-tool-btn" @click="addFeeAmount(50000)">+50 ming</button>
              <button type="button" class="mini-tool-btn" @click="addFeeAmount(100000)">+100 ming</button>
              <button type="button" class="mini-tool-btn text-danger" @click="form.fee = 0">Nollash</button>
            </div>
          </div>

          <!-- Eski narx (chegirma) -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="fld-label mb-0">Eski narx (so'm)</label>
              <span v-if="discountPercent > 0" class="save-chip text-[11px] py-0.5">
                -{{ discountPercent }}% chegirma
              </span>
              <span v-else class="text-[11.5px]" style="color: var(--text-faint)">
                0 — chegirmasiz
              </span>
            </div>
            <ElInputNumber
              v-model="form.originalFee"
              :min="0"
              :step="1000"
              :controls="false"
              class="w-full num-input"
              placeholder="0 (chegirmasiz bo'lsa)"
            />
            <!-- Tezkor chegirma hisoblash -->
            <div class="flex items-center gap-1 mt-1.5 flex-wrap">
              <button type="button" class="mini-tool-btn" :disabled="!form.fee" @click="applyDiscountPreset(20)">-20%</button>
              <button type="button" class="mini-tool-btn" :disabled="!form.fee" @click="applyDiscountPreset(30)">-30%</button>
              <button type="button" class="mini-tool-btn" :disabled="!form.fee" @click="applyDiscountPreset(50)">-50%</button>
              <button type="button" class="mini-tool-btn" @click="applyDiscountPreset(0)">Chegirmasiz</button>
            </div>
          </div>
        </div>

        <!-- 4. Imkoniyatlar va limitlar (Features) -->
        <div class="feature-box">
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-[13px] font-bold" style="color: var(--text)">Tarif imkoniyatlari (Features)</div>
              <div class="text-[11.5px]" style="color: var(--text-faint)">
                AI orqali taomni aniqlash kabi imkoniyatlar limitini belgilang
              </div>
            </div>
            <button type="button" class="btn-ghost-sm" @click="addCustomFeature">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Qo'shish
            </button>
          </div>

          <div class="space-y-2.5">
            <div
              v-for="(feat, idx) in form.features"
              :key="feat.featureKey || idx"
              class="feature-item"
              :class="{ 'is-disabled': !feat.enabled }"
            >
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2.5">
                  <ElSwitch v-model="feat.enabled" size="small" />
                  <div>
                    <template v-if="feat.isCustom">
                      <ElInput
                        v-model="feat.featureKey"
                        placeholder="Feature key (masalan, Recipes)"
                        size="small"
                        style="width: 180px"
                      />
                    </template>
                    <template v-else>
                      <span class="text-[13px] font-semibold" style="color: var(--text)">
                        {{ feat.name || feat.featureKey }}
                      </span>
                      <span class="text-[11px] ml-1.5 px-1.5 py-0.5 rounded" style="background: var(--surface-2); color: var(--text-muted)">
                        {{ feat.featureKey }}
                      </span>
                    </template>
                  </div>
                </div>

                <div v-if="feat.enabled" class="flex items-center gap-2">
                  <ElRadioGroup v-model="feat.mode" size="small">
                    <ElRadio value="unlimited">Cheksiz (unlimited)</ElRadio>
                    <ElRadio value="custom">Limit (son)</ElRadio>
                  </ElRadioGroup>
                  <button
                    v-if="feat.isCustom"
                    type="button"
                    class="text-danger p-1 rounded hover:bg-danger-soft transition"
                    title="O'chirish"
                    @click="removeFeatureItem(idx)"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>

              <!-- Limit miqdorini kiritish paneli -->
              <div v-if="feat.enabled && feat.mode === 'custom'" class="mt-2.5 pt-2 pl-8 flex items-center justify-between flex-wrap gap-2" style="border-top: 1px dashed var(--border)">
                <div class="flex items-center gap-1.5">
                  <span class="text-[11.5px]" style="color: var(--text-muted)">Limit miqdori:</span>
                  <ElInputNumber
                    v-model="feat.count"
                    :min="0"
                    :max="100000"
                    :step="5"
                    size="small"
                    controls-position="right"
                    style="width: 120px"
                  />
                  <span class="text-[11.5px]" style="color: var(--text-faint)">ta so'rov</span>
                </div>
                <!-- Preset miqdorlar -->
                <div class="flex items-center gap-1">
                  <button
                    v-for="c in [5, 10, 20, 50, 100]"
                    :key="c"
                    type="button"
                    class="mini-tool-btn"
                    :class="{ 'is-active': feat.count === c }"
                    @click="feat.count = c"
                  >
                    {{ c }} ta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Ilovadagi jonli ko'rinishi (Live Preview) -->
        <div class="preview-box">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider" style="color: var(--text-faint)">
              ILOVADA QANDAY KO'RINADI (PREVIEW)
            </span>
            <span class="text-[11.5px]" style="color: var(--text-muted)">
              Paywall kartochkasi
            </span>
          </div>

          <div class="live-card" :class="{ 'is-popular': form.isPopular, 'is-family': form.plan === 'Family' }">
            <span v-if="form.isPopular" class="live-ribbon">★ Eng yaxshi taklif</span>

            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="badge" :style="{ background: planStyle(form.plan).bg, color: planStyle(form.plan).color }">
                    {{ planStyle(form.plan).badge }}
                  </span>
                  <span class="text-[15px] font-bold" style="color: var(--text)">
                    {{ form.duration }} oylik obuna
                  </span>
                </div>

                <!-- Imkoniyatlar checklisti -->
                <div class="mt-2.5 space-y-1">
                  <div
                    v-for="feat in form.features.filter((f) => f.enabled && f.featureKey)"
                    :key="feat.featureKey"
                    class="flex items-center gap-1.5 text-[12px]"
                    style="color: var(--text-muted)"
                  >
                    <svg class="w-3.5 h-3.5 text-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{{ feat.name || feat.featureKey }}:</span>
                    <strong style="color: var(--text)">
                      {{ feat.mode === 'unlimited' ? 'Cheksiz' : `${feat.count} ta` }}
                    </strong>
                  </div>

                  <div v-if="form.plan === 'Family'" class="flex items-center gap-1.5 text-[12px]" style="color: var(--info)">
                    <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>2-oila a'zosi uchun 100% kupon taqdim etiladi</span>
                  </div>
                </div>
              </div>

              <!-- Narx bloki -->
              <div class="text-right shrink-0">
                <div class="text-[18px] font-black" style="color: var(--brand-strong)">
                  {{ formatMoney(form.fee || 0, "standard") }}
                </div>
                <div v-if="discountPercent > 0" class="text-[12.5px] line-through mt-0.5" style="color: var(--text-faint)">
                  {{ formatMoney(form.originalFee, "standard") }}
                </div>
                <div v-if="discountPercent > 0" class="mt-1">
                  <span class="save-chip">-{{ discountPercent }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Faollik va Eng yaxshi taklif kalitlari -->
        <div class="p-3 rounded-xl space-y-3" style="background: var(--surface-2); border: 1px solid var(--border)">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[13px] font-semibold" style="color: var(--text)">Faol tarif (isActive)</div>
              <div class="text-[11.5px]" style="color: var(--text-faint)">
                Faqat faol tariflar ilovada sotuv uchun chiqariladi
              </div>
            </div>
            <ElSwitch v-model="form.isActive" />
          </div>

          <div class="pt-2 flex items-center justify-between" style="border-top: 1px dashed var(--border)">
            <div>
              <div class="text-[13px] font-semibold" style="color: var(--text)">Eng yaxshi taklif (isPopular)</div>
              <div class="text-[11.5px]" style="color: var(--text-faint)">
                Har bir tarif turida (masalan, Premium yoki Family) bitta asosiy tavsiya etiladigan paket
              </div>
            </div>
            <ElSwitch v-model="form.isPopular" :disabled="!form.isActive" />
          </div>
        </div>

        <!-- Ogohlantirish yoki xatolik xabarlari -->
        <div v-if="formError" class="p-3 rounded-xl flex items-start gap-2 text-[12.5px]" style="background: var(--danger-soft); color: var(--danger); border: 1px solid rgba(240, 68, 56, 0.2)">
          <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>{{ formError }}</div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2.5">
          <button type="button" class="btn-ghost" @click="dialogOpen = false">Bekor qilish</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="!!formError || saving"
            @click="save"
          >
            <svg v-if="saving" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            {{ saving ? "Saqlanmoqda..." : (editingId ? "O'zgarishlarni saqlash" : "Tarifni yaratish") }}
          </button>
        </div>
      </template>
    </ElDialog>
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
.btn-ghost-sm {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border: 1px solid transparent;
  transition: all 0.15s ease;
}
.btn-ghost-sm:hover {
  background: var(--surface-hover);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 18px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 4px 12px rgba(var(--brand-rgb), 0.3);
  transition: all 0.15s ease;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
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
.plan-card.is-off {
  opacity: 0.62;
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
.feature-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
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
.icon-act {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.icon-act:hover:not(:disabled) {
  filter: brightness(0.95);
  transform: translateY(-1px);
}
.icon-act:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.fld-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.family-notice {
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--info-soft);
  color: var(--info);
  border: 1px solid rgba(11, 165, 236, 0.25);
  font-size: 12.5px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* ─── Modal maxsus stillari ──────────────────────────────────────── */
.plan-type-btn {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.plan-type-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover, var(--border));
}
.plan-type-btn.is-active {
  background: var(--surface);
  border-color: var(--brand);
  box-shadow: 0 0 0 1px var(--brand);
}
.plan-type-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.plan-type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.plan-type-hint {
  font-size: 10.5px;
  color: var(--text-faint);
  margin-top: 4px;
  line-height: 1.3;
}

.quick-pill {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 7px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.quick-pill:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.quick-pill.is-active {
  background: var(--brand-soft);
  color: var(--brand-strong);
  border-color: rgba(var(--brand-rgb), 0.3);
}

.mini-tool-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
}
.mini-tool-btn:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-hover);
}
.mini-tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mini-tool-btn.is-active {
  background: var(--brand-soft);
  color: var(--brand-strong);
  border-color: rgba(var(--brand-rgb), 0.3);
}

.feature-box {
  padding: 14px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.feature-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  transition: opacity 0.15s ease;
}
.feature-item.is-disabled {
  opacity: 0.6;
}

.preview-box {
  padding: 14px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.live-card {
  position: relative;
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.live-card.is-popular {
  border-color: var(--warning);
}
.live-card.is-family {
  border-color: rgba(11, 165, 236, 0.4);
}
.live-ribbon {
  position: absolute;
  top: -10px;
  left: 14px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--warning);
  box-shadow: 0 2px 6px rgba(247, 144, 9, 0.3);
}

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
.text-danger {
  color: var(--danger);
}
.text-success {
  color: var(--brand-strong);
}
</style>
<style scoped>
.num-input :deep(.el-input__inner) {
  text-align: left;
}
</style>

<!-- Teleport qilingan (append-to-body) modalka uchun global stillar -->
<style>
.el-overlay:has(.plan-dialog) {
  overflow: hidden !important;
}

.plan-dialog {
  display: flex !important;
  flex-direction: column !important;
  max-height: 88vh !important;
  margin: auto !important;
  border-radius: 18px !important;
  overflow: hidden !important;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.22) !important;
  background: var(--surface) !important;
}

.plan-dialog .el-dialog__header {
  flex-shrink: 0 !important;
  padding: 18px 24px 14px !important;
  margin-right: 0 !important;
  border-bottom: 1px solid var(--border) !important;
}

.plan-dialog .el-dialog__header .el-dialog__title {
  font-size: 16px !important;
  font-weight: 700 !important;
  color: var(--text) !important;
}

.plan-dialog .el-dialog__body {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  padding: 20px 24px !important;
}

/* Modalka ichki scrollbar ko'rinishi */
.plan-dialog .el-dialog__body::-webkit-scrollbar {
  width: 6px;
}
.plan-dialog .el-dialog__body::-webkit-scrollbar-track {
  background: transparent;
}
.plan-dialog .el-dialog__body::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}
.plan-dialog .el-dialog__body::-webkit-scrollbar-thumb:hover {
  background: var(--text-faint);
}

.plan-dialog .el-dialog__footer {
  flex-shrink: 0 !important;
  padding: 14px 24px 18px !important;
  border-top: 1px solid var(--border) !important;
  background: var(--surface) !important;
}
</style>
