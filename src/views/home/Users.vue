<script setup lang="ts">
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElInput,
  ElMessage,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { ref } from "vue";
import { useUserStore } from "../../stores/userStore";
import { makeFileUrl } from "../../integrations/axios";
import { formatDate } from "../../utils/FormatHelper";
import { ROLES } from "../../constants/ApiContstants";
import type { EnumRole, GetAllUsersDto } from "../../@types/user";
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

const clearFilters = () => {
  nameFilter.value = "";
  emailFilter.value = "";
  phoneFilter.value = "";
  tableKey.value++;
};

const roleTagType = (role: string) => {
  if (role === "SuperAdmin") return "danger";
  if (role === "Operator") return "warning";
  return "info";
};

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
</script>

<template>
  <Card title="Foydalanuvchilar">
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <ElInput
        v-model="nameFilter"
        placeholder="Ism bo'yicha"
        clearable
        size="large"
        style="max-width: 220px"
        @input="onFilterInput"
        @clear="onFilterInput"
      />
      <ElInput
        v-model="emailFilter"
        placeholder="Email bo'yicha"
        clearable
        size="large"
        style="max-width: 240px"
        @input="onFilterInput"
        @clear="onFilterInput"
      />
      <ElInput
        v-model="phoneFilter"
        placeholder="Telefon bo'yicha"
        clearable
        size="large"
        style="max-width: 200px"
        @input="onFilterInput"
        @clear="onFilterInput"
      />
      <ElButton
        v-if="nameFilter || emailFilter || phoneFilter"
        size="large"
        @click="clearFilters"
      >
        Tozalash
      </ElButton>
    </div>
    <DataTable :key="tableKey" :loader="loadUsers">
      <ElTableColumn label="ID" prop="id" width="80" />

      <ElTableColumn label="Ism">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <img
              v-if="row.extra?.photo"
              :src="makeFileUrl(row.extra.photo)"
              class="w-8 h-8 rounded-full object-cover"
            />
            <span>{{ row.name ?? "—" }}</span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Aloqa">
        <template #default="{ row }">
          <div class="flex flex-col text-sm">
            <CopyText v-if="row.email" :text="row.email" />
            <CopyText v-if="row.phone" :text="row.phone" class="text-gray-400" />
            <span v-if="!row.email && !row.phone">—</span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Rollar" min-width="220">
        <template #default="{ row }">
          <div class="flex items-center gap-1 flex-wrap">
            <ElTag
              v-for="r in row.roles ?? []"
              :key="r"
              :type="roleTagType(r)"
              size="small"
              closable
              @close="handleRemoveRole(row, r)"
            >
              {{ r }}
            </ElTag>
            <span v-if="!row.roles?.length" class="text-gray-400">—</span>
            <ElDropdown
              v-if="availableRoles(row).length > 0"
              trigger="click"
              @command="(role: EnumRole) => handleAddRole(row, role)"
            >
              <ElButton size="small" circle>
                <ElIcon><Plus /></ElIcon>
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem
                    v-for="r in availableRoles(row)"
                    :key="r"
                    :command="r"
                  >
                    {{ r }}
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Obuna">
        <template #default="{ row }">
          <template v-if="row.subscription">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1">
                <ElTag
                  :type="
                    row.subscription.plan === 'Pro'
                      ? 'success'
                      : row.subscription.plan === 'Premium'
                        ? 'warning'
                        : 'info'
                  "
                  size="small"
                >
                  {{ row.subscription.plan }}
                </ElTag>
                <ElTag
                  :type="row.subscription.isActive ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.subscription.isActive ? "Faol" : "Faol emas" }}
                </ElTag>
              </div>
              <span class="text-xs text-gray-400">{{
                formatDate(row.subscription.endsAt)
              }}</span>
            </div>
          </template>
          <span v-else>—</span>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>
