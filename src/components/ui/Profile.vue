<script setup lang="ts">
import { ArrowDownBold, CloseBold } from "@element-plus/icons-vue";
import { ElAvatar, ElCol, ElDropdown, ElIcon, ElRow } from "element-plus";
import { useAuthStore } from "../../stores/authStore";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const logOut = async () => {
  await authStore.logOut();
  await router.replace({ path: "/auth/sign-in", force: true });
};
</script>

<template>
  <div class="flex flex-row justify-around gap-x-2 items-center">
    <div class="flex justify-center items-center">
      <ElAvatar class="shrink-0" src="/images/avatar.png" size="large" />
    </div>
    <div>
      <ElDropdown size="large" placement="bottom" class="outline-none">
        <div class="flex flex-row items-center gap-x-4">
          <div class="flex flex-col gap-y-2">
            <h1 class="font-bold text-[14px] text-[#404040]">Behzodxo'ja</h1>
            <p>Admin</p>
          </div>
          <ElIcon>
            <ArrowDownBold />
          </ElIcon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item divided :icon="CloseBold" @click="logOut"
              >Log out</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </ElDropdown>
    </div>
  </div>
</template>
