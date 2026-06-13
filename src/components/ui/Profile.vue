<script setup lang="ts">
import { ArrowDownBold, SwitchButton } from "@element-plus/icons-vue";
import { ElDropdown, ElIcon } from "element-plus";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import { useTokenStore } from "../../stores/tokenStore";
import { useCrmStore } from "../../stores/crmStore";

const authStore = useAuthStore();
const tokenStore = useTokenStore();
const crmStore = useCrmStore();
const router = useRouter();

const name = ref<string>("");

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: "Administrator",
  HeadOfSales: "Sotuv boshlig'i",
  Operator: "Operator",
  User: "Foydalanuvchi",
};

// Highest-priority role drives the displayed label.
const ROLE_PRIORITY = ["SuperAdmin", "HeadOfSales", "Operator", "User"];

const roleLabel = computed(() => {
  // Prefer the role the user signed in as; fall back to their highest owned role.
  const role =
    tokenStore.activeRole ?? ROLE_PRIORITY.find((r) => tokenStore.hasRole(r));
  return role ? ROLE_LABELS[role] ?? "Foydalanuvchi" : "Foydalanuvchi";
});

const displayName = computed(() => name.value || roleLabel.value);

const initial = computed(() => (displayName.value.trim()[0] ?? "?").toUpperCase());

onMounted(async () => {
  try {
    const res = await crmStore.getMe();
    if (res?.content?.name) name.value = res.content.name;
  } catch {
    /* keep role label as fallback */
  }
});

const logOut = async () => {
  await authStore.logOut();
  await router.replace({ path: "/auth/sign-in", force: true });
};
</script>

<template>
  <ElDropdown size="large" placement="bottom-end" trigger="click">
    <div class="flex items-center gap-2.5 cursor-pointer outline-none select-none rounded-xl pr-1">
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] ring-2"
        style="--tw-ring-color: var(--border); background: var(--brand-soft); color: var(--brand-strong)"
      >
        {{ initial }}
      </div>
      <div class="hidden sm:block leading-tight text-left">
        <p class="font-semibold text-[13px]" style="color: var(--text)">{{ displayName }}</p>
        <p class="text-[11px]" style="color: var(--text-faint)">{{ roleLabel }}</p>
      </div>
      <ElIcon class="hidden sm:block" style="color: var(--text-faint)"><ArrowDownBold /></ElIcon>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item :icon="SwitchButton" @click="logOut">Chiqish</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </ElDropdown>
</template>
