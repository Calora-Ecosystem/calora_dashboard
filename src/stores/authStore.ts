import { jwtDecode } from "jwt-decode";
import { defineStore } from "pinia";
import { computed } from "vue";
import { axios } from "../integrations/axios";
import { useApiCallStore } from "./apiCallStore";
import { useAppStore } from "./appStore";
import { useTokenStore } from "./tokenStore";
import { AxiosError } from "axios";

export const useAuthStore = defineStore("auth", () => {
  const appStore = useAppStore();
  const tokenStore = useTokenStore();
  const { execute } = useApiCallStore();

  const isAuthenticated = computed(() => {
    if (tokenStore.accessToken === null) return false;
    const parsed = jwtDecode(tokenStore.accessToken);

    if (parsed === null) return false;

    if ((parsed?.exp ?? 0) * 1000 < Date.now()) return false;

    return true;
  });

  const sendOtp = (data: { email: string }) =>
    execute(async () => {
      const response = await axios.post("/auth/send-otp/email/" + data.email);

      return response.data;
    });

  const signInViaEmail = (data: {
    email: string;
    verificationCode: string;
    code: string;
  }) =>
    execute(async () => {
      const response = await axios.post("/auth/sign-in/email/", {
        ...data,
        deviceInfo: {
          key: "web",
          name: navigator.userAgent.substring(0, 100),
          fcmToken: null,
        },
      });

      const { content } = response.data;

      tokenStore.setTokens(
        content.accessToken,
        content.refreshToken,
        content.refreshTokenExpireAt,
      );

      return response.data;
    });

  const refreshToken = () => {
    execute(async () => {
      try {
        const response = await axios.get("/auth/refresh-token/", {
          params: { rToken: tokenStore.refreshToken },
        });

        const { content } = response.data;

        tokenStore.setTokens(
          content.accessToken,
          content.refreshToken,
          content.refreshTokenExpireAt,
        );

        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          tokenStore.clearTokens();
          window.location.reload();
        }
      }
    });
  };

  const logOut = () =>
    execute(async () => {
      tokenStore.clearTokens();
      await axios.get("/auth/logout");
    });

  return {
    sendOtp,
    signInViaEmail,
    isAuthenticated,
    refreshToken,
    logOut,
  };
});
