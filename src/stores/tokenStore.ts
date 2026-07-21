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
    // The role the user signed in AS. Scopes which sections of the UI are shown,
    // even when the account holds several roles.
    const activeRole = ref<string | null>(null);

    const setTokens = (access: string, refresh: string, expireAt: number) => {
      accessToken.value = access;
      refreshToken.value = refresh;
      refreshTokenExpireAt.value = expireAt;
    };

    const clearTokens = () => {
      accessToken.value = null;
      refreshToken.value = null;
      refreshTokenExpireAt.value = null;
      activeRole.value = null;
    };

    const setActiveRole = (role: string | null) => {
      activeRole.value = role;
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

    /** Id of the signed-in user, read from the `user-id` JWT claim. */
    const userId = computed<number | null>(() => {
      if (!accessToken.value) return null;
      try {
        const raw = jwtDecode<Record<string, any>>(accessToken.value)?.["user-id"];
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
      } catch {
        return null;
      }
    });

    const hasRole = (role: string) => roles.value.includes(role);
    const isSuperAdmin = computed(() => hasRole("SuperAdmin"));
    const isOperator = computed(() => hasRole("Operator"));
    const isHeadOfSales = computed(() => hasRole("HeadOfSales"));

    /**
     * Whether a nav item / route requiring `required` roles is visible for the
     * current session. Scoped to the role the user signed in as (activeRole);
     * SuperAdmin sees everything. Falls back to owned-roles for legacy sessions.
     */
    const canView = (required?: string[]) => {
      if (!required?.length) return true;
      const active = activeRole.value;
      if (!active) return required.some((r) => hasRole(r));
      if (active === "SuperAdmin") return true;
      return required.includes(active) && hasRole(active);
    };

    return {
      accessToken,
      refreshToken,
      refreshTokenExpireAt,
      activeRole,
      roles,
      userId,
      isSuperAdmin,
      isOperator,
      isHeadOfSales,
      hasRole,
      canView,
      setActiveRole,
      setTokens,
      clearTokens,
    };
  },
  { persist: true },
);
