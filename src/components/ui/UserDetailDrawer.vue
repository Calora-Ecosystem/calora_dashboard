<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElDrawer } from "element-plus";
import { useUserStore } from "../../stores/userStore";
import { makeFileUrl } from "../../integrations/axios";
import { formatDate } from "../../utils/FormatHelper";
import type { UserDetailDto } from "../../@types/user";
import CopyText from "../shared/CopyText.vue";

const props = defineProps<{
  modelValue: boolean;
  userId: number | null;
}>();
const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void }>();

const userStore = useUserStore();
const detail = ref<UserDetailDto | null>(null);
const loading = ref(false);

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

watch(
  () => [props.modelValue, props.userId] as const,
  async ([isOpen, id]) => {
    if (isOpen && id) {
      loading.value = true;
      detail.value = null;
      try {
        detail.value = await userStore.getUserDetail(id);
      } finally {
        loading.value = false;
      }
    }
  },
);

// ── Yorliq xaritalari ─────────────────────────────────────────────
const GENDER_LABELS: Record<number, string> = { 1: "Erkak", 2: "Ayol" };
const PURPOSE_LABELS: Record<number, string> = {
  1: "Vazn kamaytirish",
  2: "Saqlab qolish",
  3: "Mushak yig'ish",
};
const ACTIVITY_LABELS: Record<number, string> = {
  1: "Minimal",
  2: "Kam",
  3: "O'rta",
  4: "Yuqori",
  5: "Maksimal",
};
const LANGUAGE_LABELS: Record<number, string> = {
  1: "O'zbek",
  2: "Kirill",
  3: "Rus",
  4: "Ingliz",
};
const PHYSICAL_LABELS: Record<number, string> = { 1: "Sog'lom", 2: "Nosog'lom" };
const METRIC_UNITS: Record<string, string> = {
  Protein: "g",
  Fat: "g",
  Carb: "g",
  Kcal: "kcal",
  Water: "ml",
  Step: "qadam",
  Weight: "kg",
};

const initials = (name: string | null) =>
  (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const roleStyle = (role: string) => {
  if (role === "SuperAdmin") return { bg: "var(--danger-soft)", fg: "var(--danger)" };
  if (role === "Operator") return { bg: "var(--warning-soft)", fg: "var(--warning)" };
  if (role === "HeadOfSales") return { bg: "var(--purple-soft)", fg: "var(--purple)" };
  return { bg: "var(--info-soft)", fg: "var(--info)" };
};

const extra = computed(() => detail.value?.extra ?? null);

const profileRows = computed(() => {
  const e = extra.value;
  if (!e) return [];
  return [
    { label: "Jinsi", value: GENDER_LABELS[e.gender] ?? "—" },
    { label: "Yoshi", value: e.age ? `${e.age} yosh` : "—" },
    { label: "Tug'ilgan sana", value: e.birthDate ? formatDate(e.birthDate) : "—" },
    { label: "Bo'yi", value: e.height ? `${e.height} sm` : "—" },
    { label: "Vazni", value: e.weight ? `${e.weight} kg` : "—" },
    { label: "Boshlang'ich vazn", value: e.entryWeight ? `${e.entryWeight} kg` : "—" },
    { label: "BMI", value: e.bmi ? `${e.bmi}` : "—" },
    { label: "Maqsad", value: PURPOSE_LABELS[e.purpose] ?? "—" },
    { label: "Faollik darajasi", value: ACTIVITY_LABELS[e.activityLevel] ?? "—" },
    {
      label: "Jismoniy holat",
      value: e.physicalActivity ? PHYSICAL_LABELS[e.physicalActivity] ?? "—" : "—",
    },
    { label: "Til", value: LANGUAGE_LABELS[e.language] ?? "—" },
  ];
});

const sub = computed(() => detail.value?.subscription ?? null);
const norms = computed(() => detail.value?.norms ?? []);

const planStyle = (plan: string) => {
  if (plan === "Pro") return { bg: "var(--purple-soft)", fg: "var(--purple)" };
  if (plan === "Premium") return { bg: "var(--brand-soft)", fg: "var(--brand-strong)" };
  return { bg: "var(--surface-hover)", fg: "var(--text-muted)" };
};
</script>

<template>
  <ElDrawer v-model="open" title="Foydalanuvchi ma'lumotlari" size="440px" :destroy-on-close="true">
    <div v-if="loading" class="py-16 text-center text-[13px]" style="color: var(--text-faint)">
      Yuklanmoqda...
    </div>

    <div v-else-if="detail" class="space-y-5">
      <!-- Sarlavha -->
      <div class="flex items-center gap-3">
        <img
          v-if="extra?.photo"
          :src="makeFileUrl(extra.photo)"
          class="w-14 h-14 rounded-2xl object-cover shrink-0"
        />
        <span
          v-else
          class="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[18px] font-bold text-white"
          style="background: var(--brand-strong)"
        >{{ initials(detail.name) }}</span>
        <div class="min-w-0">
          <p class="font-bold text-[16px] truncate" style="color: var(--text)">{{ detail.name ?? "—" }}</p>
          <p class="text-[12px]" style="color: var(--text-faint)">ID #{{ detail.id }}</p>
        </div>
      </div>

      <!-- Rollar -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <span
          v-for="r in detail.roles"
          :key="r"
          class="px-2 py-0.5 rounded-full text-[11.5px] font-semibold"
          :style="{ background: roleStyle(r).bg, color: roleStyle(r).fg }"
        >{{ r }}</span>
      </div>

      <!-- Aloqa -->
      <div class="p-4 rounded-2xl space-y-2" style="background: var(--surface-2); border: 1px solid var(--border)">
        <p class="text-[12px] font-semibold uppercase tracking-wide mb-1" style="color: var(--text-faint)">Aloqa</p>
        <div class="flex items-center justify-between text-[13px]">
          <span style="color: var(--text-muted)">Email</span>
          <CopyText v-if="detail.email" :text="detail.email" />
          <span v-else style="color: var(--text-faint)">—</span>
        </div>
        <div class="flex items-center justify-between text-[13px]">
          <span style="color: var(--text-muted)">Telefon</span>
          <CopyText v-if="detail.phone" :text="detail.phone" />
          <span v-else style="color: var(--text-faint)">—</span>
        </div>
      </div>

      <!-- Faollik / ro'yxatdan o'tish -->
      <div class="grid grid-cols-2 gap-3">
        <div class="p-3 rounded-2xl" style="background: var(--surface-2); border: 1px solid var(--border)">
          <p class="text-[11.5px]" style="color: var(--text-faint)">Ro'yxatdan o'tgan</p>
          <p class="text-[14px] font-semibold mt-0.5" style="color: var(--text)">{{ formatDate(detail.createdAt) }}</p>
        </div>
        <div class="p-3 rounded-2xl" style="background: var(--surface-2); border: 1px solid var(--border)">
          <p class="text-[11.5px]" style="color: var(--text-faint)">Kirishlar soni</p>
          <p class="text-[14px] font-semibold mt-0.5" style="color: var(--text)">{{ detail.signInCount }}</p>
        </div>
        <div class="p-3 rounded-2xl col-span-2" style="background: var(--surface-2); border: 1px solid var(--border)">
          <p class="text-[11.5px]" style="color: var(--text-faint)">Oxirgi kirish</p>
          <p class="text-[14px] font-semibold mt-0.5" style="color: var(--text)">
            {{ detail.lastSignInAt ? formatDate(detail.lastSignInAt) : "—" }}
          </p>
        </div>
      </div>

      <!-- Obuna -->
      <div class="p-4 rounded-2xl" style="background: var(--surface-2); border: 1px solid var(--border)">
        <p class="text-[12px] font-semibold uppercase tracking-wide mb-2" style="color: var(--text-faint)">Obuna</p>
        <div v-if="sub" class="flex items-center justify-between">
          <span
            class="px-2 py-0.5 rounded-full text-[11.5px] font-semibold"
            :style="{ background: planStyle(sub.plan).bg, color: planStyle(sub.plan).fg }"
          >{{ sub.plan }}</span>
          <div class="text-right text-[12px]" style="color: var(--text-muted)">
            <span :style="{ color: sub.isActive ? 'var(--success)' : 'var(--danger)' }">
              {{ sub.isActive ? "Faol" : "Faol emas" }}
            </span>
            · {{ formatDate(sub.endsAt) }}gacha
          </div>
        </div>
        <p v-else class="text-[13px]" style="color: var(--text-faint)">Bepul (obunasiz)</p>
      </div>

      <!-- Profil (extra) -->
      <div v-if="extra" class="p-4 rounded-2xl" style="background: var(--surface-2); border: 1px solid var(--border)">
        <p class="text-[12px] font-semibold uppercase tracking-wide mb-2" style="color: var(--text-faint)">Profil</p>
        <div class="divide-y" style="border-color: var(--border)">
          <div v-for="row in profileRows" :key="row.label" class="flex items-center justify-between py-1.5 text-[13px]">
            <span style="color: var(--text-muted)">{{ row.label }}</span>
            <span class="font-medium" style="color: var(--text)">{{ row.value }}</span>
          </div>
        </div>
      </div>
      <div v-else class="p-4 rounded-2xl text-[13px]" style="background: var(--surface-2); border: 1px solid var(--border); color: var(--text-faint)">
        Profil ma'lumotlari to'ldirilmagan
      </div>

      <!-- Normalar -->
      <div v-if="norms.length" class="p-4 rounded-2xl" style="background: var(--surface-2); border: 1px solid var(--border)">
        <p class="text-[12px] font-semibold uppercase tracking-wide mb-2" style="color: var(--text-faint)">Kunlik normalar</p>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="n in norms"
            :key="n.metric"
            class="flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px]"
            style="background: var(--surface); border: 1px solid var(--border)"
          >
            <span style="color: var(--text-muted)">{{ n.metric }}</span>
            <span class="font-semibold" style="color: var(--text)">
              {{ n.value }} {{ METRIC_UNITS[n.metric] ?? "" }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="py-16 text-center text-[13px]" style="color: var(--text-faint)">
      Ma'lumot topilmadi
    </div>
  </ElDrawer>
</template>
