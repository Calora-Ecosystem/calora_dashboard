<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  ElDialog,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElPopconfirm,
  ElRadio,
  ElRadioGroup,
  ElSelect,
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
          description: "AI taomni aniqlash limiti ('unlimited' yoki raqam)",
        },
      ];
    }
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const planStyle = (plan: SubscriptionPlan) => {
  switch (plan) {
    case "Premium":
      return { bg: "var(--brand-soft)", color: "var(--brand-strong)", badge: "Premium" };
    case "Family":
      return { bg: "var(--info-soft)", color: "var(--info)", badge: "Oilaviy · 2 kishi" };
    case "Pro":
      return { bg: "var(--purple-soft, #f4ebff)", color: "var(--purple, #7a5af8)", badge: "Pro" };
    case "Free":
      return { bg: "var(--surface-2)", color: "var(--text-muted)", badge: "Free (Bepul)" };
    default:
      return { bg: "var(--surface-2)", color: "var(--text-muted)", badge: plan };
  }
};

const featureDisplayName = (key: string) => {
  if (key === "AiScans") return "AI Skan";
  const found = featureDefs.value.find((f) => f.featureKey === key);
  return found?.name || key;
};

const formatFeatureDisplay = (val: string) => {
  if (!val) return "—";
  if (val.trim().toLowerCase() === "unlimited") return "Cheksiz";
  if (/^\d+$/.test(val.trim())) return `${val} ta`;
  return val;
};

// Tariflarni plan turi bo'yicha guruhlash
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
      title = "Premium";
      subtitle = "Ilovadagi standart individual obuna paketlari";
    } else if (plan === "Family") {
      title = "Oilaviy (Family)";
      subtitle = "2 kishi uchun paket — sotib olganga va ikkinchi a'zoga 100% kupon beriladi";
    } else if (plan === "Pro") {
      title = "Pro";
      subtitle = "Kengaytirilgan imkoniyatlarga ega Pro paketlar";
    } else if (plan === "Free") {
      title = "Free (Bepul)";
      subtitle = "Bepul tarif uchun standart limitlar";
    }

    groups.push({ key: plan, plan, title, subtitle, items });
  }

  return groups;
});

// ─── Yaratish / tahrirlash formasi ────────────────────────────────
type FormFeatureItem = {
  featureKey: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  mode: "unlimited" | "custom";
  count: number;
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
    const existing = p.features?.find((f) => f.featureKey === d.featureKey);
    if (existing) {
      const isUnlim = existing.value.trim().toLowerCase() === "unlimited";
      return {
        featureKey: d.featureKey,
        name: d.name,
        description: d.description,
        enabled: true,
        mode: isUnlim ? "unlimited" : "custom",
        count: isUnlim ? 50 : parseInt(existing.value) || 0,
      };
    }
    return {
      featureKey: d.featureKey,
      name: d.name,
      description: d.description,
      enabled: false,
      mode: "unlimited",
      count: 50,
    };
  });

  // Agar backendda noma'lum boshqa feature bo'lsa, uni ham qo'shamiz
  for (const ext of p.features || []) {
    if (!featuresList.some((f) => f.featureKey === ext.featureKey)) {
      const isUnlim = ext.value.trim().toLowerCase() === "unlimited";
      featuresList.push({
        featureKey: ext.featureKey,
        name: ext.featureKey,
        description: "",
        enabled: true,
        mode: isUnlim ? "unlimited" : "custom",
        count: isUnlim ? 50 : parseInt(ext.value) || 0,
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

const onPlanChange = (newPlan: SubscriptionPlan) => {
  if (!editingId.value) {
    // Yangi tarif yaratishda plan o'zgarsa, feature limitlarini qulay moslaymiz
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

// Chegirma foizi — 0 bo'lsa eski narx ko'rsatilmaydi
const discountPercent = computed(() => {
  if (!form.originalFee || form.originalFee <= form.fee) return 0;
  return Math.round((1 - form.fee / form.originalFee) * 100);
});

const formError = computed(() => {
  if (!form.duration || form.duration < 1) return "Muddat kamida 1 oy bo'lishi kerak";
  if (form.fee < 0) return "Joriy narx manfiy bo'lishi mumkin emas";
  if (form.originalFee !== 0 && form.originalFee <= form.fee)
    return "Eski narx joriy narxdan katta bo'lishi kerak (yoki 0 — chegirmasiz)";
  return "";
});

const save = async () => {
  if (formError.value) return;
  saving.value = true;
  try {
    const featuresPayload: PlanFeatureDto[] = form.features
      .filter((f) => f.enabled)
      .map((f) => ({
        featureKey: f.featureKey,
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

// Kartochkadan tez amallar: faollik va "eng yaxshi taklif"
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

    <!-- Yaratish / tahrirlash oynasi -->
    <ElDialog
      v-model="dialogOpen"
      :title="editingId ? 'Tarifni tahrirlash' : 'Yangi tarif'"
      width="560px"
      align-center
    >
      <div class="space-y-4">
        <!-- Tarif turi va muddat -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="fld-label">Tarif turi (Plan)</label>
            <ElSelect v-model="form.plan" class="w-full" @change="onPlanChange">
              <ElOption label="Premium" value="Premium">
                <div class="flex items-center justify-between">
                  <span>Premium</span>
                  <span class="text-[11.5px]" style="color: var(--brand-strong)">Standart</span>
                </div>
              </ElOption>
              <ElOption label="Family (Oilaviy · 2 kishi)" value="Family">
                <div class="flex items-center justify-between">
                  <span>Oilaviy (Family)</span>
                  <span class="text-[11.5px]" style="color: var(--info)">2 kishi</span>
                </div>
              </ElOption>
              <ElOption label="Pro" value="Pro">
                <div class="flex items-center justify-between">
                  <span>Pro</span>
                  <span class="text-[11.5px]" style="color: var(--warning)">Kengaytirilgan</span>
                </div>
              </ElOption>
              <ElOption label="Free" value="Free">
                <div class="flex items-center justify-between">
                  <span>Free (Bepul)</span>
                  <span class="text-[11.5px]" style="color: var(--text-faint)">Standart limit</span>
                </div>
              </ElOption>
            </ElSelect>
          </div>
          <div>
            <label class="fld-label">Muddat (oy)</label>
            <ElInputNumber v-model="form.duration" :min="1" :max="120" class="w-full" controls-position="right" />
          </div>
        </div>

        <!-- Oilaviy tarif tanlanganda tushuntirish banneri -->
        <div v-if="form.plan === 'Family'" class="family-notice">
          <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>
            <strong>Oilaviy tarif (2 kishi):</strong> Xarid qilgan foydalanuvchiga to'liq Premium obuna ochiladi va ikkinchi odam uchun ushbu muddatga teng 100% chegirmali bir martalik kupon generatsiya qilinadi.
          </div>
        </div>

        <!-- Narxlar -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="fld-label">Joriy narx (so'm)</label>
            <ElInputNumber v-model="form.fee" :min="0" :step="1000" :controls="false" class="w-full num-input" />
          </div>
          <div>
            <label class="fld-label">Eski narx (so'm) — chegirmasiz: 0</label>
            <ElInputNumber v-model="form.originalFee" :min="0" :step="1000" :controls="false" class="w-full num-input" />
          </div>
        </div>

        <!-- Features (Imkoniyatlar va limitlar) -->
        <div class="feature-section">
          <div class="flex items-center justify-between mb-2.5">
            <div>
              <span class="text-[13px] font-bold" style="color: var(--text)">Imkoniyatlar va limitlar (Features)</span>
              <p class="text-[11.5px]" style="color: var(--text-faint)">
                Ushbu tarif paketi doirasidagi imkoniyat limitlari (masalan, AI skanlar soni)
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="feat in form.features"
              :key="feat.featureKey"
              class="feature-row"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <ElSwitch v-model="feat.enabled" size="small" />
                  <div>
                    <span class="text-[13px] font-semibold" style="color: var(--text)">{{ feat.name || feat.featureKey }}</span>
                    <span class="text-[11.5px] ml-1.5" style="color: var(--text-faint)">({{ feat.featureKey }})</span>
                  </div>
                </div>
                <div v-if="feat.enabled" class="flex items-center gap-2">
                  <ElRadioGroup v-model="feat.mode" size="small">
                    <ElRadio value="unlimited">Cheksiz (unlimited)</ElRadio>
                    <ElRadio value="custom">Limit (son)</ElRadio>
                  </ElRadioGroup>
                </div>
              </div>

              <!-- Custom miqdor kiritish -->
              <div v-if="feat.enabled && feat.mode === 'custom'" class="mt-2.5 pl-8 flex items-center gap-2.5">
                <label class="text-[12px]" style="color: var(--text-muted)">Maksimal limit:</label>
                <ElInputNumber
                  v-model="feat.count"
                  :min="0"
                  :max="100000"
                  :step="10"
                  size="small"
                  controls-position="right"
                  style="width: 140px"
                />
                <span class="text-[12px]" style="color: var(--text-faint)">ta so'rov</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ilovada qanday ko'rinishi (Preview) -->
        <div class="preview">
          <div class="text-[11px] font-bold uppercase tracking-wider mb-2.5" style="color: var(--text-faint)">
            ILOVADA QANDAY KO'RINADI
          </div>
          <div class="preview-card" :class="{ 'is-popular': form.isPopular }">
            <span v-if="form.isPopular" class="preview-ribbon">Eng yaxshi taklif</span>
            <div class="flex items-center justify-between gap-3">
              <div>
                <span class="text-[14.5px] font-semibold" style="color: var(--text)">
                  {{ form.plan === "Family" ? `${form.duration} oylik Oilaviy (2 kishi)` : `${form.duration} oylik ${form.plan}` }}
                </span>
                <div class="flex items-center gap-1.5 mt-1">
                  <span
                    v-for="feat in form.features.filter((f) => f.enabled)"
                    :key="feat.featureKey"
                    class="mini-badge"
                    style="background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border)"
                  >
                    {{ feat.name }}: {{ feat.mode === 'unlimited' ? 'Cheksiz' : `${feat.count} ta` }}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-[14.5px] font-bold" style="color: var(--text)">{{ formatMoney(form.fee || 0, "standard") }}</div>
                <div v-if="discountPercent" class="text-[12.5px] line-through" style="color: var(--text-faint)">
                  {{ formatMoney(form.originalFee, "standard") }}
                </div>
              </div>
            </div>
          </div>
          <div v-if="discountPercent" class="mt-2">
            <span class="save-chip">-{{ discountPercent }}% chegirma</span>
          </div>
        </div>

        <!-- Faollik va Eng yaxshi taklif -->
        <div class="flex items-center justify-between py-1">
          <div>
            <div class="text-[13.5px] font-semibold" style="color: var(--text)">Faol</div>
            <div class="text-[12px]" style="color: var(--text-faint)">Faqat faol tariflar ilovada xarid qilish uchun ko'rinadi</div>
          </div>
          <ElSwitch v-model="form.isActive" />
        </div>

        <div class="flex items-center justify-between py-1">
          <div>
            <div class="text-[13.5px] font-semibold" style="color: var(--text)">Eng yaxshi taklif (Popular)</div>
            <div class="text-[12px]" style="color: var(--text-faint)">
              Har bir tarif turida (Premium, Family, Pro...) eng ko'p tavsiya etiladigan bitta paket
            </div>
          </div>
          <ElSwitch v-model="form.isPopular" :disabled="!form.isActive" />
        </div>

        <div v-if="formError" class="text-[13px]" style="color: var(--danger)">{{ formError }}</div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button class="btn-ghost" @click="dialogOpen = false">Bekor qilish</button>
          <button class="btn-primary" :disabled="!!formError || saving" @click="save">
            {{ saving ? "Saqlanmoqda..." : "Saqlash" }}
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
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
.feature-section {
  padding: 14px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.feature-row {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.preview {
  padding: 14px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.preview-card {
  position: relative;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.preview-card.is-popular {
  border-color: var(--brand);
  border-width: 1.5px;
}
.preview-ribbon {
  position: absolute;
  top: -10px;
  left: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--brand);
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
</style>
<style scoped>
.num-input :deep(.el-input__inner) {
  text-align: left;
}
</style>
