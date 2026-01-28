import { defineStore } from "pinia";
import { ref } from "vue";

export const useTokenStore = defineStore(
  "tkns",
  () => {
    const accessToken = ref(null);
    const refreshToken = ref(null);
    const refreshTokenExpireAt = ref(null);

    const setTokens = (access: string, refresh: string, expireAt: number) => {
      accessToken.value = access as any;
      refreshToken.value = refresh as any;
      refreshTokenExpireAt.value = expireAt as any;
    };

    const clearTokens = () => {
      accessToken.value = null;
      refreshToken.value = null;
      refreshTokenExpireAt.value = null;
    };

    return {
      accessToken,
      refreshToken,
      refreshTokenExpireAt,
      setTokens,
      clearTokens,
    };
  },
  { persist: true },
);
