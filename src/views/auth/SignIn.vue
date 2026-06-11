<script setup lang="ts">
import { reactive, ref, computed, onUnmounted } from "vue";
import { useAuthStore } from "../../stores/authStore";
import { useAppStore } from "../../stores/appStore";
import { useTokenStore } from "../../stores/tokenStore";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const appStore = useAppStore();
const tokenStore = useTokenStore();
const router = useRouter();

const state = reactive({ otpPending: false });
const formData = reactive({
  email: "",
  otp: "",
  verificationCode: "" as string,
});

// resend countdown
const seconds = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;
const startCountdown = () => {
  seconds.value = 60;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (seconds.value > 0) seconds.value--;
    else if (timer) clearInterval(timer);
  }, 1000);
};
onUnmounted(() => timer && clearInterval(timer));

const mmss = computed(() => {
  const m = Math.floor(seconds.value / 60);
  const s = seconds.value % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
});

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email));

const sendOtp = async () => {
  const { content } = await authStore.sendOtp({ email: formData.email });
  formData.verificationCode = content.verificationCode;
  state.otpPending = true;
  startCountdown();
};

const handleSubmit = async () => {
  if (!state.otpPending) {
    if (!emailValid.value) return;
    await sendOtp();
  } else {
    await authStore.signInViaEmail({
      email: formData.email,
      verificationCode: formData.verificationCode ?? "",
      code: String(formData.otp ?? ""),
    });
    if (tokenStore.isOperator && !tokenStore.isSuperAdmin) {
      await router.push("/crm/leads");
    } else {
      await router.push("/dashboard");
    }
    state.otpPending = false;
  }
};

const changeEmail = () => {
  state.otpPending = false;
  formData.otp = "";
  if (timer) clearInterval(timer);
};
</script>

<template>
  <div>
    <h1 class="text-[28px] font-bold tracking-tight" style="color: var(--text)">
      Xush kelibsiz 👋
    </h1>
    <p class="mt-2 text-[14.5px]" style="color: var(--text-muted)">
      {{ state.otpPending
        ? "Emailingizga yuborilgan tasdiqlash kodini kiriting"
        : "Davom etish uchun hisobingizga kiring" }}
    </p>

    <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
      <!-- Email -->
      <div>
        <label class="field-label">Email manzil</label>
        <div class="field" :class="{ 'field-disabled': state.otpPending }">
          <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <input
            v-model="formData.email"
            type="email"
            placeholder="example@gmail.com"
            autocomplete="email"
            :disabled="state.otpPending"
            class="field-input"
          />
          <button
            v-if="state.otpPending"
            type="button"
            class="text-[12px] font-semibold shrink-0 pr-1"
            style="color: var(--brand-strong)"
            @click="changeEmail"
          >
            O'zgartirish
          </button>
        </div>
      </div>

      <!-- OTP -->
      <transition name="slide-fade">
        <div v-if="state.otpPending">
          <div class="flex items-center justify-between">
            <label class="field-label">Tasdiqlash kodi</label>
            <span class="text-[12px]" style="color: var(--text-faint)">
              <span v-if="seconds > 0">Qayta yuborish: {{ mmss }}</span>
              <button v-else type="button" class="font-semibold" style="color: var(--brand-strong)" @click="sendOtp">
                Qayta yuborish
              </button>
            </span>
          </div>
          <div class="field">
            <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input
              v-model="formData.otp"
              v-maska="'######'"
              inputmode="numeric"
              placeholder="• • • • • •"
              autocomplete="one-time-code"
              class="field-input tracking-[0.4em] font-semibold"
            />
          </div>
        </div>
      </transition>

      <!-- Submit -->
      <button
        type="submit"
        class="submit-btn"
        :disabled="appStore.isLoading || (!state.otpPending && !emailValid)"
      >
        <span v-if="appStore.isLoading" class="spinner"></span>
        <span>{{ state.otpPending ? "Kirish" : "Kodni yuborish" }}</span>
        <svg v-if="!appStore.isLoading" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </form>

    <p class="mt-8 text-center text-[13px]" style="color: var(--text-faint)">
      Muammo bormi?
      <span class="font-semibold" style="color: var(--brand-strong)">Qo'llab-quvvatlash</span>
      bilan bog'laning
    </p>
  </div>
</template>

<style scoped>
.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 7px;
  color: var(--text);
}
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 50px;
  padding: 0 14px;
  border-radius: 13px;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  transition: all 0.15s ease;
}
.field:focus-within {
  border-color: var(--brand);
  background: var(--surface);
  box-shadow: var(--ring);
}
.field-disabled {
  opacity: 0.7;
}
.field-icon {
  width: 19px;
  height: 19px;
  color: var(--text-faint);
  flex-shrink: 0;
}
.field-input {
  flex: 1;
  background: transparent;
  outline: none;
  border: none;
  font-size: 15px;
  color: var(--text);
  min-width: 0;
}
.field-input::placeholder {
  color: var(--text-faint);
}

.submit-btn {
  width: 100%;
  height: 50px;
  margin-top: 4px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 8px 20px rgba(var(--brand-rgb), 0.35);
  transition: all 0.18s ease;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(var(--brand-rgb), 0.45);
}
.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
