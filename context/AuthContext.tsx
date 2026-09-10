import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthToken, setUnauthorizedHandler } from "../lib/api-client";

type User = { id: number; name: string; phone: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "beem_auth_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        setAuthToken(parsed.token);
        setUser(parsed.user);
      }
      setLoading(false);
    });
  }, []);

  async function login(token: string, user: User) {
    setAuthToken(token);
    setUser(user);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  }

  async function logout() {
    setAuthToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  // Any 401 from the API (expired token, or the account it points to is gone)
  // should log the customer out the same way a manual logout does, so AuthGate
  // picks it up and sends them to /login instead of the screen just failing.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
