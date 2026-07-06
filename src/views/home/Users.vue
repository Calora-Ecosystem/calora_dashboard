<script setup lang="ts">
import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTableColumn,
} from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { reactive, ref } from "vue";
import { useUserStore } from "../../stores/userStore";
import { makeFileUrl } from "../../integrations/axios";
import { formatDate } from "../../utils/FormatHelper";
import { PLANS, ROLES } from "../../constants/ApiContstants";
import type { EnumRole, EnumSPlans, GetAllUsersDto } from "../../@types/user";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import CopyText from "../../components/shared/CopyText.vue";

const userStore = useUserStore();

const nameFilter = ref("");
const emailFilter = ref("");
const phoneFilter = ref("");
const tableKey = ref(0);

const loadUsers = (skip: number, take: number) =>
  userStore.loadUsersPaged(skip, take, {
    name: nameFilter.value,
    email: emailFilter.value,
    phone: phoneFilter.value,
  });

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onFilterInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    tableKey.value++;
  }, 350);
};

const hasFilters = () => !!(nameFilter.value || emailFilter.value || phoneFilter.value);

const clearFilters = () => {
  nameFilter.value = "";
  emailFilter.value = "";
  phoneFilter.value = "";
  tableKey.value++;
};

const roleStyle = (role: string) => {
  if (role === "SuperAdmin") return { bg: "var(--danger-soft)", fg: "var(--danger)" };
  if (role === "Operator") return { bg: "var(--warning-soft)", fg: "var(--warning)" };
  return { bg: "var(--info-soft)", fg: "var(--info)" };
};

const planStyle = (plan: string) => {
  if (plan === "Pro") return { bg: "var(--purple-soft)", fg: "var(--purple)" };
  if (plan === "Premium") return { bg: "var(--brand-soft)", fg: "var(--brand-strong)" };
  return { bg: "var(--surface-hover)", fg: "var(--text-muted)" };
};

const initials = (name: string | null) =>
  (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const avatarHue = (id: number) => (id * 47) % 360;

const availableRoles = (row: GetAllUsersDto): EnumRole[] => {
  const current = row.roles ?? [];
  return ROLES.filter((r) => !current.includes(r));
};

const handleAddRole = async (row: GetAllUsersDto, role: EnumRole) => {
  const next = [...(row.roles ?? []), role] as EnumRole[];
  const fresh = await userStore.updateRoles(row.id, next);
  if (fresh?.roles) {
    row.roles = fresh.roles;
    ElMessage.success(`"${role}" roli biriktirildi`);
  }
};

const handleRemoveRole = async (row: GetAllUsersDto, role: EnumRole) => {
  const next = (row.roles ?? []).filter((r) => r !== role) as EnumRole[];
  const fresh = await userStore.updateRoles(row.id, next);
  if (fresh?.roles) {
    row.roles = fresh.roles;
    ElMessage.success(`"${role}" roli olib tashlandi`);
  }
};

// ── Obunani tahrirlash / yaratish ────────────────────────────────
const subDialog = ref(false);
const subSaving = ref(false);
const subRow = ref<GetAllUsersDto | null>(null);
const subForm = reactive<{
  plan: EnumSPlans;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}>({
  plan: "Premium",
  startsAt: "",
  endsAt: "",
  isActive: true,
});

const toIso = (d: Date) => d.toISOString();

const openSubDialog = (row: GetAllUsersDto) => {
  subRow.value = row;
  const now = new Date();
  const inMonth = new Date();
  inMonth.setMonth(inMonth.getMonth() + 1);
  subForm.plan = (row.subscription?.plan as EnumSPlans) ?? "Premium";
  subForm.startsAt = row.subscription?.startsAt ?? toIso(now);
  subForm.endsAt = row.subscription?.endsAt ?? toIso(inMonth);
  subForm.isActive = row.subscription?.isActive ?? true;
  subDialog.value = true;
};

const saveSubscription = async () => {
  if (!subRow.value) return;
  if (!subForm.startsAt || !subForm.endsAt) {
    ElMessage.warning("Boshlanish va tugash sanasini tanlang");
    return;
  }
  if (new Date(subForm.endsAt) <= new Date(subForm.startsAt)) {
    ElMessage.warning("Tugash sanasi boshlanishdan keyin bo'lishi kerak");
    return;
  }
  subSaving.value = true;
  try {
    const result = await userStore.upsertSubscription({
      userId: subRow.value.id,
      plan: subForm.plan,
      startsAt: subForm.startsAt,
      endsAt: subForm.endsAt,
      isActive: subForm.isActive,
    });
    if (result) {
      subRow.value.subscription = result;
      ElMessage.success("Obuna saqlandi");
      subDialog.value = false;
    }
  } finally {
    subSaving.value = false;
  }
};

const removeSubscription = async () => {
  if (!subRow.value?.subscription) return;
  try {
    await ElMessageBox.confirm(
      "Foydalanuvchining obunasini o'chirishni tasdiqlaysizmi?",
      "Tasdiqlash",
      { type: "warning", confirmButtonText: "O'chirish", cancelButtonText: "Bekor" },
    );
  } catch {
    return;
  }
  subSaving.value = true;
  try {
    await userStore.deleteSubscription(subRow.value.id);
    subRow.value.subscription = null;
    ElMessage.success("Obuna o'chirildi");
    subDialog.value = false;
  } finally {
    subSaving.value = false;
  }
};
</script>

<template>
  <Card title="Foydalanuvchilar" subtitle="Barcha ro'yxatdan o'tgan foydalanuvchilar ro'yxati">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2.5 mb-5">
      <ElInput
        v-model="nameFilter"
        placeholder="Ism bo'yicha qidirish"
        clearable
        size="large"
        style="max-width: 230px"
        @input="onFilterInput"
        @clear="onFilterInput"
      >
        <template #prefix>
          <svg class="w-4 h-4" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </template>
      </ElInput>
      <ElInput
        v-model="emailFilter"
        placeholder="Email"
        clearable
        size="large"
        style="max-width: 230px"
        @input="onFilterInput"
        @clear="onFilterInput"
      />
      <ElInput
        v-model="phoneFilter"
        placeholder="Telefon"
        clearable
        size="large"
        style="max-width: 190px"
        @input="onFilterInput"
        @clear="onFilterInput"
      />
      <ElButton v-if="hasFilters()" size="large" @click="clearFilters">Tozalash</ElButton>
    </div>

    <DataTable :key="tableKey" :loader="loadUsers">
      <ElTableColumn label="ID" prop="id" width="72" />

      <ElTableColumn label="Foydalanuvchi" min-width="220">
        <template #default="{ row }">
          <div class="flex items-center gap-3 py-1">
            <img
              v-if="row.extra?.photo"
              :src="makeFileUrl(row.extra.photo)"
              class="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <span
              v-else
              class="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
              :style="{ background: `hsl(${avatarHue(row.id)} 55% 50%)` }"
            >{{ initials(row.name) }}</span>
            <div class="min-w-0">
              <p class="font-semibold text-[13.5px] truncate" style="color: var(--text)">{{ row.name ?? "—" }}</p>
              <p class="text-[11.5px]" style="color: var(--text-faint)">ID #{{ row.id }}</p>
            </div>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Aloqa" min-width="200">
        <template #default="{ row }">
          <div class="flex flex-col text-[13px] gap-0.5">
            <CopyText v-if="row.email" :text="row.email" />
            <CopyText v-if="row.phone" :text="row.phone" style="color: var(--text-faint)" />
            <span v-if="!row.email && !row.phone" style="color: var(--text-faint)">—</span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Rollar" min-width="200">
        <template #default="{ row }">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              v-for="r in row.roles ?? []"
              :key="r"
              class="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold"
              :style="{ background: roleStyle(r).bg, color: roleStyle(r).fg }"
            >
              {{ r }}
              <button
                class="opacity-50 hover:opacity-100 transition-opacity"
                @click="handleRemoveRole(row, r)"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
            <span v-if="!row.roles?.length" style="color: var(--text-faint)">—</span>
            <ElDropdown
              v-if="availableRoles(row).length > 0"
              trigger="click"
              @command="(role: EnumRole) => handleAddRole(row, role)"
            >
              <button
                class="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                style="background: var(--surface-hover); color: var(--text-muted)"
              >
                <ElIcon :size="12"><Plus /></ElIcon>
              </button>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem v-for="r in availableRoles(row)" :key="r" :command="r">{{ r }}</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Obuna" min-width="160">
        <template #default="{ row }">
          <div v-if="row.subscription" class="flex flex-col gap-1">
            <div class="flex items-center gap-1.5">
              <span
                class="px-2 py-0.5 rounded-full text-[11.5px] font-semibold"
                :style="{ background: planStyle(row.subscription.plan).bg, color: planStyle(row.subscription.plan).fg }"
              >{{ row.subscription.plan }}</span>
              <span
                class="w-2 h-2 rounded-full"
                :style="{ background: row.subscription.isActive ? 'var(--success)' : 'var(--danger)' }"
                :title="row.subscription.isActive ? 'Faol' : 'Faol emas'"
              ></span>
            </div>
            <span class="text-[11px]" style="color: var(--text-faint)">
              {{ formatDate(row.subscription.endsAt) }}gacha
            </span>
          </div>
          <span v-else style="color: var(--text-faint)">Bepul</span>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Qo'shilgan" min-width="130">
        <template #default="{ row }">
          <span class="text-[12.5px]" style="color: var(--text-muted)">{{ formatDate(row.createdAt) }}</span>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Amallar" min-width="120" align="right">
        <template #default="{ row }">
          <ElButton size="small" @click="openSubDialog(row)">
            {{ row.subscription ? "Obunani tahrirlash" : "Obuna berish" }}
          </ElButton>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>

  <!-- Obunani yaratish / tahrirlash dialogi -->
  <ElDialog
    v-model="subDialog"
    :title="subRow?.subscription ? 'Obunani tahrirlash' : 'Obuna berish'"
    width="440px"
  >
    <p v-if="subRow" class="text-[13px] mb-4" style="color: var(--text-muted)">
      Foydalanuvchi: <b>{{ subRow.name ?? "—" }}</b> (ID #{{ subRow.id }})
    </p>
    <ElForm label-position="top">
      <ElFormItem label="Tarif">
        <ElSelect v-model="subForm.plan" style="width: 100%">
          <ElOption v-for="p in PLANS" :key="p" :label="p" :value="p" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="Boshlanish sanasi">
        <ElDatePicker
          v-model="subForm.startsAt"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss[Z]"
          style="width: 100%"
          placeholder="Sanani tanlang"
        />
      </ElFormItem>
      <ElFormItem label="Tugash sanasi">
        <ElDatePicker
          v-model="subForm.endsAt"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss[Z]"
          style="width: 100%"
          placeholder="Sanani tanlang"
        />
      </ElFormItem>
      <ElFormItem label="Faol">
        <ElSwitch v-model="subForm.isActive" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <ElButton
          v-if="subRow?.subscription"
          type="danger"
          plain
          :loading="subSaving"
          @click="removeSubscription"
        >O'chirish</ElButton>
        <span v-else></span>
        <div class="flex gap-2">
          <ElButton @click="subDialog = false">Bekor</ElButton>
          <ElButton type="primary" :loading="subSaving" @click="saveSubscription">Saqlash</ElButton>
        </div>
      </div>
    </template>
  </ElDialog>
</template>
