import { defineStore } from "pinia";
import { IHandlerChain, THandler } from "../@types/handler";
import { useAppStore } from "./appStore";
import { AxiosError } from "axios";
import { useAuthStore } from "./authStore";
import { useTokenStore } from "./tokenStore";
import { axios } from "../integrations/axios";
import { router } from "../views/router";
import { ElNotification } from "element-plus";

let __tokenRefreshing = null as any | null;

class HandlerChain implements IHandlerChain {
  private __handlers: THandler[] = [];

  next: (handler: THandler) => IHandlerChain = (handler) => {
    this.__handlers = [handler, ...this.__handlers];
    return this;
  };

  execute: THandler = async (action) => {
    const dispatch = async (index: number, currentAction: any) => {
      const handler = this.__handlers[index];

      if (!handler) return await currentAction();

      return dispatch(index + 1, async () => await handler(currentAction));
    };

    return dispatch(0, action);
  };

  clone: () => HandlerChain = () => {
    const cloned = new HandlerChain();
    cloned.__handlers = [...this.__handlers];
    return cloned;
  };
}

const useApiCallStore = defineStore("api_call", () => {
  const handler: HandlerChain = new HandlerChain();
  const appStore = useAppStore();
  const authStore = useAuthStore();
  const tokenStore = useTokenStore();

  handler
    //notification handler
    .next(async (action) => {
      try {
        const result: any = await action();
        if (result?.code !== undefined && result.code !== 200 && result.error) {
          ElNotification({ title: "Xato", message: result.error, type: "error" });
        }
        return result;
      } catch (error) {
        const silent = (error as AxiosError)?.config
          ? ((error as AxiosError).config as any)?.silent
          : false;
        if (
          error instanceof AxiosError &&
          error.response?.status !== 401 &&
          !silent
        ) {
          ElNotification({
            title: "Xato",
            message: error.response?.data?.error ?? error.message,
            type: "error",
          });
        }
        throw error;
      }
    })
    //log api errors
    .next(async (action) => {
      try {
        return await action();
      } catch (error) {
        if (error instanceof AxiosError)
          console.error("API ERROR: ", error.response?.data?.error);
        else console.error("SYSTEM ERROR: ", error);
        throw error;
      }
    })
    //loading handler
    .next(async (action) => {
      appStore.isLoading = true;
      try {
        return await action();
      } catch (error) {
        throw error;
      } finally {
        appStore.isLoading = false;
      }
    })
    //refresh token handler
    .next(async (action) => {
      try {
        return await action();
      } catch (error) {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            if (
              error.response.data?.error === "token_expired" ||
              error.response.data?.error === "session_expired"
            ) {
              if (!__tokenRefreshing) {
                __tokenRefreshing = authStore.refreshToken().finally(() => {
                  __tokenRefreshing = null;
                });
              }

              await __tokenRefreshing;

              return await action();
            } else {
              await authStore.logOut();
              router.replace("/");
            }
          }
        }
        throw error;
      }
    })
    //access token handler
    .next(async (action) => {
      if (
        !!tokenStore.accessToken &&
        (tokenStore.accessToken! as any).length > 0
      )
        axios.defaults.headers.common.Authorization =
          "Bearer " + tokenStore.accessToken;

      // Tell the API which role the user is acting as, so a multi-role
      // account is scoped to that role (e.g. operator sees only own leads).
      if (tokenStore.activeRole)
        axios.defaults.headers.common["X-Active-Role"] = tokenStore.activeRole;
      else delete axios.defaults.headers.common["X-Active-Role"];

      return await action();
    });
  //language
  // .next(async (action) => {
  //   axios.defaults.headers.common["Accept-Language"] = "UZ";
  //   return await action();
  // });

  return {
    handler,
    execute: handler.execute,
  };
});

export { useApiCallStore };
