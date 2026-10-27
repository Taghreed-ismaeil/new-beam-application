import type { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

export type AdminSection = {
  key: string;
  href: string;
  /** `can(resource)` decides whether the entry appears at all — the server refuses the same routes anyway. */
  resource: string;
  icon: IconName;
  title: string;
  text: string;
  group: "operations" | "catalog" | "stock" | "people" | "settings";
};

// Shared by the dashboard's section list and the desktop sidebar so the two never drift apart.
export const SECTIONS: AdminSection[] = [
  { key: "orders", href: "/admin/orders", resource: "orders", icon: "receipt-outline", title: "navOrdersTitle", text: "navOrdersText", group: "operations" },
  { key: "reservations", href: "/admin/reservations", resource: "reservations", icon: "calendar-outline", title: "navReservationsTitle", text: "navReservationsText", group: "operations" },
  { key: "menu", href: "/admin/menu", resource: "menu", icon: "restaurant-outline", title: "navMenuTitle", text: "navMenuText", group: "catalog" },
  { key: "offers", href: "/admin/offers", resource: "offers", icon: "pricetag-outline", title: "navOffersTitle", text: "navOffersText", group: "catalog" },
  { key: "rewards", href: "/admin/rewards", resource: "rewards", icon: "gift-outline", title: "navRewardsTitle", text: "navRewardsText", group: "catalog" },
  { key: "media", href: "/admin/media", resource: "media", icon: "images-outline", title: "navMediaTitle", text: "navMediaText", group: "catalog" },
  { key: "feedback", href: "/admin/feedback", resource: "feedback", icon: "chatbubbles-outline", title: "navFeedbackTitle", text: "navFeedbackText", group: "people" },
  { key: "inventory", href: "/admin/inventory", resource: "inventory", icon: "cube-outline", title: "navInventoryTitle", text: "navInventoryText", group: "stock" },
  { key: "suppliers", href: "/admin/suppliers", resource: "suppliers", icon: "briefcase-outline", title: "navSuppliersTitle", text: "navSuppliersText", group: "stock" },
  { key: "expenses", href: "/admin/expenses", resource: "expenses", icon: "wallet-outline", title: "navExpensesTitle", text: "navExpensesText", group: "stock" },
  { key: "customers", href: "/admin/customers", resource: "customers", icon: "people-outline", title: "navCustomersTitle", text: "navCustomersText", group: "people" },
  { key: "staff", href: "/admin/staff", resource: "staff", icon: "id-card-outline", title: "navStaffTitle", text: "navStaffText", group: "people" },
  { key: "settings", href: "/admin/settings", resource: "settings", icon: "settings-outline", title: "navSettingsTitle", text: "navSettingsText", group: "settings" },
];

export const NAV_GROUPS = [
  { key: "operations", label: "navGroupOperations" },
  { key: "catalog", label: "navGroupCatalog" },
  { key: "stock", label: "navGroupStock" },
  { key: "people", label: "navGroupPeople" },
  { key: "settings", label: "navGroupSettings" },
] as const;

export const ROLE_LABEL: Record<string, string> = {
  owner: "roleOwner",
  admin: "roleAdmin",
  manager: "roleManager",
  chef: "roleChef",
  cashier: "roleCashier",
  waiter: "roleWaiter",
};

/** Screens wider than this get the persistent sidebar instead of navigating via the dashboard. */
export const SIDEBAR_BREAKPOINT = 1024;
