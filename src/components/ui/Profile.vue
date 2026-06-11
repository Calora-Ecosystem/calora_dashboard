<script setup lang="ts">
import { ArrowDownBold, SwitchButton } from "@element-plus/icons-vue";
import { ElDropdown, ElIcon } from "element-plus";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";

const authStore = useAuthStore();
const router = useRouter();

const logOut = async () => {
  await authStore.logOut();
  await router.replace({ path: "/auth/sign-in", force: true });
};
</script>

<template>
  <ElDropdown size="large" placement="bottom-end" trigger="click">
    <div class="flex items-center gap-2.5 cursor-pointer outline-none select-none rounded-xl pr-1">
      <img
        src="/images/avatar.png"
        alt="avatar"
        class="w-9 h-9 rounded-full object-cover ring-2"
        style="--tw-ring-color: var(--border)"
      />
      <div class="hidden sm:block leading-tight text-left">
        <p class="font-semibold text-[13px]" style="color: var(--text)">Behzodxo'ja</p>
        <p class="text-[11px]" style="color: var(--text-faint)">Admin</p>
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
