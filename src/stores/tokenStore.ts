import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { jwtDecode } from "jwt-decode";

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export const useTokenStore = defineStore(
  "tkns",
  () => {
    const accessToken = ref<string | null>(null);
    const refreshToken = ref<string | null>(null);
    const refreshTokenExpireAt = ref<number | null>(null);

    const setTokens = (access: string, refresh: string, expireAt: number) => {
      accessToken.value = access;
      refreshToken.value = refresh;
      refreshTokenExpireAt.value = expireAt;
    };

    const clearTokens = () => {
      accessToken.value = null;
      refreshToken.value = null;
      refreshTokenExpireAt.value = null;
    };

    const roles = computed<string[]>(() => {
      if (!accessToken.value) return [];
      try {
        const payload = jwtDecode<Record<string, any>>(accessToken.value);
        const claim = payload?.[ROLE_CLAIM];
        if (!claim) return [];
        return Array.isArray(claim) ? claim : [claim];
      } catch {
        return [];
      }
    });

    const hasRole = (role: string) => roles.value.includes(role);
    const isSuperAdmin = computed(() => hasRole("SuperAdmin"));
    const isOperator = computed(() => hasRole("Operator"));

    return {
      accessToken,
      refreshToken,
      refreshTokenExpireAt,
      roles,
      isSuperAdmin,
      isOperator,
      hasRole,
      setTokens,
      clearTokens,
    };
  },
  { persist: true },
);
