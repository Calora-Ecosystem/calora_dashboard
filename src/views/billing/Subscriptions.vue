<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  ElDialog,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElPopconfirm,
  ElSelect,
  ElSwitch,
} from "element-plus";
import Card from "../../components/ui/Card.vue";
import {
  useBillingStore,
  type CreateOrUpdatePlanExtraDto,
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

// ─── Yaratish / tahrirlash ────────────────────────────────────────
const dialogOpen = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);

const emptyForm = (): CreateOrUpdatePlanExtraDto => ({
  plan: "Premium",
  duration: 1,
  fee: 0,
  originalFee: 0,
  isActive: true,
  isPopular: false,
});

const form = reactive<CreateOrUpdatePlanExtraDto>(emptyForm());

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, emptyForm());
  dialogOpen.value = true;
};

const openEdit = (p: PlanExtraDto) => {
  editingId.value = p.id;
  Object.assign(form, {
    id: p.id,
    plan: p.plan,
    duration: p.duration,
    fee: p.fee,
    originalFee: p.originalFee,
    isActive: p.isActive,
    isPopular: p.isPopular,
  });
  dialogOpen.value = true;
};

// Chegirma foizi — 0 bo'lsa eski narx ko'rsatilmaydi
const discountPercent = computed(() => {
  if (!form.originalFee || form.originalFee <= form.fee) return 0;
  return Math.round((1 - form.fee / form.originalFee) * 100);
});

const formError = computed(() => {
  if (!form.duration || form.duration < 1) return "Muddat kamida 1 oy bo'lishi kerak";
  if (form.fee <= 0) return "Joriy narxni kiriting";
  if (form.originalFee !== 0 && form.originalFee <= form.fee)
    return "Eski narx joriy narxdan katta bo'lishi kerak (yoki 0 — chegirmasiz)";
  return "";
});

const save = async () => {
  if (formError.value) return;
  saving.value = true;
  try {
    const payload: CreateOrUpdatePlanExtraDto = {
      ...form,
      ...(editingId.value ? { id: editingId.value } : {}),
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
const quickToggle = async (p: PlanExtraDto, patch: Partial<PlanExtraDto>) => {
  try {
    const res = await billingStore.modifyPlan({
      id: p.id,
      plan: p.plan,
      duration: p.duration,
      fee: p.fee,
      originalFee: p.originalFee,
      isActive: p.isActive,
      isPopular: p.isPopular,
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
  <Card title="Obuna tariflari" subtitle="Ilovadagi obuna paketlarini boshqaring">
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
    <div v-else class="space-y-7">
      <div v-for="group in grouped" :key="group.plan">
        <div class="flex items-center gap-2.5 mb-3">
          <span class="badge" :style="{ background: planStyle(group.plan).bg, color: planStyle(group.plan).color }">{{ group.plan }}</span>
          <span class="text-[12.5px]" style="color: var(--text-faint)">{{ group.items.length }} ta paket</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="p in group.items" :key="p.id" class="plan-card" :class="{ 'is-popular': p.isPopular, 'is-off': !p.isActive }">
            <div class="flex items-center justify-between">
              <div class="flex items-baseline gap-1">
                <span class="text-[26px] font-extrabold" style="color: var(--text)">{{ p.duration }}</span>
                <span class="text-[14px] font-semibold" style="color: var(--text-muted)">oy</span>
              </div>
              <span v-if="p.isPopular" class="mini-badge" style="background: var(--warning-soft); color: var(--warning)">★ Eng yaxshi taklif</span>
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
      width="520px"
      align-center
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="fld-label">Plan</label>
            <ElSelect v-model="form.plan" class="w-full">
              <ElOption label="Premium" value="Premium" />
              <ElOption label="Pro" value="Pro" />
              <ElOption label="Free" value="Free" />
            </ElSelect>
          </div>
          <div>
            <label class="fld-label">Muddat (oy)</label>
            <ElInputNumber v-model="form.duration" :min="1" :max="120" class="w-full" controls-position="right" />
          </div>
        </div>

        <div>
          <label class="fld-label">Joriy narx (so'm)</label>
          <ElInputNumber v-model="form.fee" :min="0" :step="1000" :controls="false" class="w-full num-input" />
        </div>

        <div>
          <label class="fld-label">Eski narx (so'm) — chegirmasiz bo'lsa 0</label>
          <ElInputNumber v-model="form.originalFee" :min="0" :step="1000" :controls="false" class="w-full num-input" />
        </div>

        <!-- Ilovada qanday ko'rinishi -->
        <div class="preview">
          <div class="text-[11.5px] font-semibold mb-2.5" style="color: var(--text-faint)">ILOVADA QANDAY KO'RINADI</div>
          <div class="preview-card" :class="{ 'is-popular': form.isPopular }">
            <span v-if="form.isPopular" class="preview-ribbon">Eng yaxshi taklif</span>
            <div class="flex items-center justify-between gap-3">
              <span class="text-[14.5px] font-semibold" style="color: var(--text)">
                {{ form.duration }} oylik {{ form.plan }}
              </span>
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

        <div class="flex items-center justify-between py-1">
          <div>
            <div class="text-[13.5px] font-semibold" style="color: var(--text)">Faol</div>
            <div class="text-[12px]" style="color: var(--text-faint)">Faqat faol tariflar ilovada ko'rinadi</div>
          </div>
          <ElSwitch v-model="form.isActive" />
        </div>

        <div class="flex items-center justify-between py-1">
          <div>
            <div class="text-[13.5px] font-semibold" style="color: var(--text)">Eng yaxshi taklif</div>
            <div class="text-[12px]" style="color: var(--text-faint)">Har bir planda bittasi belgilanadi</div>
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
