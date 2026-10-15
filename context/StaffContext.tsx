import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  apiRequest,
  setStaffAuthToken,
  setStaffUnauthorizedHandler,
} from "../lib/api-client";

export type StaffRole = "admin" | "chef" | "cashier" | "manager" | "waiter" | "driver" | "owner";

export type Staff = {
  id: number;
  name: string;
  phone: string;
  role: StaffRole;
};

export type EndedReason = "staff_disabled" | "expired" | null;

const STORAGE_KEY = "beem_staff_session";

// Resource keys mirror the admin dashboard's SECTIONS list. A permission value of
// `true` grants view+edit, `"view"` grants read-only, and a missing/false entry
// hides the section entirely. The server re-checks every route regardless — this
// only decides what the app shows, per the comment in app/admin/_layout.tsx.
type Resource =
  | "dashboard"
  | "reports"
  | "orders"
  | "reservations"
  | "menu"
  | "offers"
  | "rewards"
  | "inventory"
  | "suppliers"
  | "expenses"
  | "customers"
  | "settings"
  | "staff"
  | "media";

type Permission = true | "view" | false;

const FULL_ACCESS: Record<Resource, Permission> = {
  dashboard: true,
  reports: true,
  orders: true,
  reservations: true,
  menu: true,
  offers: true,
  rewards: true,
  inventory: true,
  suppliers: true,
  expenses: true,
  customers: true,
  settings: true,
  staff: true,
  media: true,
};

const ROLE_PERMISSIONS: Record<StaffRole, Record<Resource, Permission>> = {
  owner: FULL_ACCESS,
  admin: FULL_ACCESS,
  manager: {
    dashboard: true,
    reports: true,
    orders: true,
    reservations: true,
    menu: true,
    offers: true,
    rewards: true,
    inventory: true,
    suppliers: true,
    expenses: true,
    customers: true,
    settings: "view",
    staff: false,
    media: true,
  },
  chef: {
    dashboard: true,
    reports: false,
    orders: true,
    reservations: false,
    menu: "view",
    offers: false,
    rewards: false,
    inventory: true,
    suppliers: "view",
    expenses: false,
    customers: false,
    settings: false,
    staff: false,
    media: false,
  },
  cashier: {
    dashboard: true,
    reports: false,
    orders: true,
    reservations: true,
    menu: "view",
    offers: "view",
    rewards: true,
    inventory: false,
    suppliers: false,
    expenses: false,
    customers: "view",
    settings: false,
    staff: false,
    media: false,
  },
  waiter: {
    dashboard: false,
    reports: false,
    orders: true,
    reservations: true,
    menu: "view",
    offers: false,
    rewards: true,
    inventory: false,
    suppliers: false,
    expenses: false,
    customers: "view",
    settings: false,
    staff: false,
    media: false,
  },
  driver: {
    dashboard: false,
    reports: false,
    orders: true,
    reservations: false,
    menu: false,
    offers: false,
    rewards: false,
    inventory: false,
    suppliers: false,
    expenses: false,
    customers: false,
    settings: false,
    staff: false,
    media: false,
  },
};

type StaffContextValue = {
  staff: Staff | null;
  loading: boolean;
  /** Set once a session is cleared by something other than a manual sign-out. */
  endedReason: EndedReason;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (resource: string, action?: "view" | "edit") => boolean;
};

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [endedReason, setEndedReason] = useState<EndedReason>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.token && parsed?.staff) {
            setStaffAuthToken(parsed.token);
            setStaff(parsed.staff);
          }
        } catch {
          // corrupt session, ignore
        }
      }
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (phone: string, password: string) => {
    const res = await apiRequest<{ token: string; staff: Staff }>("/api/staff/auth/login", {
      method: "POST",
      body: { phone, password },
    });
    setStaffAuthToken(res.token);
    setStaff(res.staff);
    setEndedReason(null);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res));
  }, []);

  const signOut = useCallback(async () => {
    setStaffAuthToken(null);
    setStaff(null);
    setEndedReason(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // A 401 while a staff session is active means it's gone stale server-side
  // (token expired, or the account was disabled) — clear it locally so the
  // admin layout's redirect-to-login logic takes over, and surface why on the
  // login screen instead of leaving the app looking merely broken.
  useEffect(() => {
    if (!staff) return;
    setStaffUnauthorizedHandler(() => {
      setStaff(null);
      setEndedReason("expired");
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    });
    return () => setStaffUnauthorizedHandler(null);
  }, [staff]);

  const can = useCallback(
    (resource: string, action: "view" | "edit" = "view") => {
      if (!staff) return false;
      const perms = ROLE_PERMISSIONS[staff.role] ?? ROLE_PERMISSIONS.waiter;
      const perm = perms[resource as Resource];
      if (perm === true) return true;
      if (perm === "view") return action !== "edit";
      return false;
    },
    [staff],
  );

  const value = useMemo(
    () => ({ staff, loading, endedReason, signIn, signOut, can }),
    [staff, loading, endedReason, signIn, signOut, can],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used within StaffProvider");
  return ctx;
}
