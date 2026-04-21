<script setup lang="ts">
import {
  ElFormItem,
  ElInput,
  ElForm,
  ElInputNumber,
  ElButton,
} from "element-plus";
import { reactive } from "vue";
import { useAuthStore } from "../../stores/authStore";
import { useAppStore } from "../../stores/appStore";

import { useRouter } from "vue-router";

const authStore = useAuthStore();
const appStore = useAppStore();

const router = useRouter();

const state = reactive({
  loading: false,
  otpPending: false,
});

const formData = reactive({
  email: "",
  otp: null,
  verificationCode: null,
});

const handleSubmit = async () => {
  if (!state.otpPending) {
    const { content } = await authStore.sendOtp({ email: formData.email });
    formData.verificationCode = content.verificationCode;
    state.otpPending = true;
  } else {
    await authStore.signInViaEmail({
      email: formData.email,
      verificationCode: formData.verificationCode ?? "",
      code: String(formData.otp ?? ""),
    });

    await router.push({ name: "dashboard" });

    state.otpPending = false;
  }
};
</script>

<template>
  <div class="flex items-center justify-center flex-col">
    <h1 class="font-medium text-2xl">Sign In</h1>
    <ElForm
      class="w-full"
      label-position="top"
      label-width="auto"
      size="large"
      @submit.prevent="handleSubmit"
    >
      <ElFormItem label="Email" required label-width="auto">
        <ElInput
          v-model="formData.email"
          placeholder="example@gmail.com"
          type="email"
          :disabled="state.otpPending"
        >
        </ElInput>
      </ElFormItem>
      <div class="w-full flex flex-row items-center" v-if="state.otpPending">
        <ElFormItem class="flex-[0.8]" label="Otp" required>
          <ElInputNumber
            v-model="formData.otp"
            class="w-full"
            :controls="false"
            placeholder="Enter otp"
            v-maska="'######'"
          />
        </ElFormItem>
        <div class="flex-[0.2] text-gray-600">timer</div>
      </div>
      <ElButton
        native-type="submit"
        class="w-full mt-4"
        type="primary"
        :loading="appStore.isLoading"
        >Sign In</ElButton
      >
    </ElForm>
  </div>
</template>
