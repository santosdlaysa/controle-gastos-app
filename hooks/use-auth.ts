import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AuthContextValue = ReturnType<typeof useAuth>;
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthContext.Provider");
  return ctx;
}

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        setUser(null);
        return;
      }

      // Try to get fresh user data from the API
      const apiUser = await Api.getMe();
      if (apiUser) {
        const userInfo: Auth.User = {
          id: apiUser.id,
          openId: apiUser.openId,
          name: apiUser.name,
          email: apiUser.email,
          loginMethod: apiUser.loginMethod,
          lastSignedIn: new Date(apiUser.lastSignedIn),
        };
        setUser(userInfo);
        await Auth.setUserInfo(userInfo);
      } else {
        // getMe failed — fall back to stored user info instead of logging out
        const storedUser = await Auth.getUserInfo();
        if (storedUser) {
          console.log("[useAuth] getMe failed, using stored user info as fallback");
          setUser(storedUser);
        } else {
          setUser(null);
          await Auth.clearUserInfo();
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      // On error, fall back to stored user info
      const storedUser = await Auth.getUserInfo();
      if (storedUser) {
        setUser(storedUser);
      } else {
        setError(error);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Set user directly after login/register without calling getMe
  const applyLogin = useCallback(async (userData: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    loginMethod: string | null;
    lastSignedIn: string | Date;
  }) => {
    const userInfo: Auth.User = {
      id: userData.id,
      openId: userData.openId,
      name: userData.name,
      email: userData.email,
      loginMethod: userData.loginMethod,
      lastSignedIn: new Date(userData.lastSignedIn),
    };
    setUser(userInfo);
    await Auth.setUserInfo(userInfo);
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
      // Continue with logout even if API call fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (autoFetch) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    applyLogin,
    logout,
  };
}
