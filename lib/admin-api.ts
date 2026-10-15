import { Platform } from "react-native";

import { API_BASE, apiRequest, getStaffAuthToken } from "./api-client";

/**
 * Typed wrappers around the `/api/admin/*` endpoints used by the admin panel
 * (app/admin/*). A handful of these already exist on the backend (see
 * backend/src/routes/*.ts) and are wired to match it exactly; the rest
 * (dashboard analytics, the customer directory, profit/loss reporting, CSV
 * export, delivery zones, purchase orders, and loyalty-item/voucher CRUD)
 * don't have a backend implementation yet. Those calls use a consistent,
 * RESTful path under /api/admin/ so the backend can be filled in later —
 * until then they fail with a 404, which every screen that calls them
 * already treats as "this feature isn't available yet" (see errRouteMissing
 * in lib/i18n.ts) rather than a hard crash.
 */

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function fetchDashboardSummary() {
  return apiRequest<{
    sales: number;
    salesChangePct?: number | null;
    ordersCount: number;
    averageOrder: number;
    byStatus: Record<string, number>;
    reservations: { total: number };
  }>("/api/admin/dashboard/summary");
}

export function fetchDashboardAlerts() {
  return apiRequest<{ alerts: any[] }>("/api/admin/dashboard/alerts");
}

export function fetchSalesSeries(range: string) {
  return apiRequest<{ total: number; points: { date: string; value: number }[] }>(
    `/api/admin/dashboard/sales?range=${encodeURIComponent(range)}`,
  );
}

export function fetchTopItems(range: string) {
  return apiRequest<{ items: any[] }>(`/api/admin/dashboard/top-items?range=${encodeURIComponent(range)}`);
}

// ---------------------------------------------------------------------------
// Settings + delivery zones
// ---------------------------------------------------------------------------

export function fetchSettings() {
  return apiRequest<{ settings: any }>("/api/admin/settings");
}

export function updateSettings(body: Record<string, any>) {
  return apiRequest<{ settings: any }>("/api/admin/settings", { method: "PUT", body });
}

export function createDeliveryZone(body: { name: string; nameEn: string; fee: number; isActive: boolean }) {
  return apiRequest<{ zone: any }>("/api/admin/settings/delivery-zones", { method: "POST", body });
}

export function updateDeliveryZone(id: number, body: Record<string, any>) {
  return apiRequest<{ zone: any }>(`/api/admin/settings/delivery-zones/${id}`, { method: "PUT", body });
}

export function deleteDeliveryZone(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/settings/delivery-zones/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export function fetchCustomers(params: { search?: string; page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<{ customers: any[]; total: number; page: number }>(
    `/api/admin/customers${qs ? `?${qs}` : ""}`,
  );
}

export function fetchCustomerDetail(id: number) {
  return apiRequest<{ customer: any; loyalty: any[]; vouchers: any[]; orders: any[] }>(
    `/api/admin/customers/${id}`,
  );
}

export function setCustomerBlocked(id: number, blocked: boolean, reason?: string) {
  return apiRequest<{ customer: any }>(`/api/admin/customers/${id}/block`, {
    method: "PATCH",
    body: { blocked, reason },
  });
}

// ---------------------------------------------------------------------------
// Expenses + profit/loss
// ---------------------------------------------------------------------------

export function fetchExpenses(params: { category?: string }) {
  const q = params.category ? `?category=${encodeURIComponent(params.category)}` : "";
  return apiRequest<{ expenses: any[]; total: number; byCategory: Record<string, number> }>(
    `/api/admin/expenses${q}`,
  );
}

export function createExpense(body: { category: string; amount: number; date: string; note?: string }) {
  return apiRequest<{ expense: any }>("/api/admin/expenses", { method: "POST", body });
}

export function updateExpense(id: number, body: Record<string, any>) {
  return apiRequest<{ expense: any }>(`/api/admin/expenses/${id}`, { method: "PUT", body });
}

export function deleteExpense(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/expenses/${id}`, { method: "DELETE" });
}

export function fetchProfitLoss(params: { from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const qs = q.toString();
  return apiRequest<{
    sales: number;
    expenses: number;
    profit: number;
    ordersCount: number;
    byCategory: Record<string, number>;
    series: { date: string; sales: number; expenses: number; profit: number }[];
  }>(`/api/admin/reports/profit-loss${qs ? `?${qs}` : ""}`);
}

/** Native has no file-save dialog wired up yet, so CSV export is web-only —
 * every caller already handles the `export_web_only` message gracefully. */
export async function downloadCsv(path: string, filename: string): Promise<void> {
  if (Platform.OS !== "web") throw new Error("export_web_only");

  const token = getStaffAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw Object.assign(new Error(`request_failed_${res.status}`), { status: res.status });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export function fetchIngredients() {
  return apiRequest<{ ingredients: any[] }>("/api/admin/inventory");
}

export function createIngredient(body: {
  name: string;
  nameEn: string;
  unit: string;
  quantity: number;
  minQuantity: number;
}) {
  return apiRequest<{ ingredient: any }>("/api/admin/inventory", { method: "POST", body });
}

/** `{ adjust }` goes through the backend's dedicated delta endpoint; anything
 * else (name/unit/minQuantity, or a stock-take's absolute `quantity`) is a
 * plain field update. */
export function updateIngredient(id: number, body: Record<string, any>) {
  if (typeof body.adjust === "number") {
    return apiRequest<{ ingredient: any }>(`/api/admin/inventory/${id}/adjust`, {
      method: "POST",
      body: { amount: body.adjust },
    });
  }
  return apiRequest<{ ingredient: any }>(`/api/admin/inventory/${id}`, { method: "PUT", body });
}

export function deleteIngredient(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/inventory/${id}`, { method: "DELETE" });
}

export function fetchStockLog(params: { direction?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params.direction) q.set("direction", params.direction);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<{ log: any[]; counts: Record<string, number> }>(
    `/api/admin/inventory/movements${qs ? `?${qs}` : ""}`,
  );
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export function fetchAdminMenu() {
  return apiRequest<{ categories: any[] }>("/api/admin/menu/categories");
}

export function createCategory(body: { name: string; nameEn: string; imageUrl: string | null; isActive: boolean }) {
  return apiRequest<{ category: any }>("/api/admin/menu/categories", { method: "POST", body });
}

export function updateCategory(id: number, body: Record<string, any>) {
  return apiRequest<{ category: any }>(`/api/admin/menu/categories/${id}`, { method: "PUT", body });
}

export function deleteCategory(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/menu/categories/${id}`, { method: "DELETE" });
}

export function reorderCategories(ids: number[]) {
  return apiRequest<{ ok: true }>("/api/admin/menu/categories/reorder", { method: "PUT", body: { ids } });
}

export function createMenuItem(body: Record<string, any>) {
  return apiRequest<{ item: any }>("/api/admin/menu/items", { method: "POST", body });
}

export function updateMenuItem(id: number, body: Record<string, any>) {
  return apiRequest<{ item: any }>(`/api/admin/menu/items/${id}`, { method: "PUT", body });
}

export function deleteMenuItem(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/menu/items/${id}`, { method: "DELETE" });
}

export function reorderItems(categoryId: number, ids: number[]) {
  return apiRequest<{ ok: true }>(`/api/admin/menu/categories/${categoryId}/items/reorder`, {
    method: "PUT",
    body: { ids },
  });
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export function fetchOffers() {
  return apiRequest<{ offers: any[] }>("/api/admin/offers");
}

export function createOffer(body: Record<string, any>) {
  return apiRequest<{ offer: any }>("/api/admin/offers", { method: "POST", body });
}

export function updateOffer(id: number, body: Record<string, any>) {
  return apiRequest<{ offer: any }>(`/api/admin/offers/${id}`, { method: "PUT", body });
}

export function deleteOffer(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/offers/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export function fetchOrders(params: { status?: string; search?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<{ orders: any[]; total: number; counts: Record<string, number> }>(
    `/api/admin/orders${qs ? `?${qs}` : ""}`,
  );
}

export function setOrderStatus(id: number, status: string) {
  return apiRequest<{ order: any }>(`/api/admin/orders/${id}/status`, { method: "PATCH", body: { status } });
}

export function cancelOrder(id: number, reason: string) {
  return apiRequest<{ order: any }>(`/api/admin/orders/${id}/status`, {
    method: "PATCH",
    body: { status: "cancelled", reason },
  });
}

export function takeOrderPayment(id: number, method: string) {
  return apiRequest<{ order: any }>(`/api/admin/orders/${id}/confirm-payment`, {
    method: "PATCH",
    body: { method },
  });
}

export function createCounterSale(body: Record<string, any>) {
  return apiRequest<{ order: any }>("/api/admin/orders/counter-sale", { method: "POST", body });
}

// ---------------------------------------------------------------------------
// Reservations + tables
// ---------------------------------------------------------------------------

export function fetchReservations(params: { status?: string }) {
  const q = params.status ? `?status=${encodeURIComponent(params.status)}` : "";
  return apiRequest<{ reservations: any[]; total: number; counts: Record<string, number>; today: any }>(
    `/api/admin/reservations${q}`,
  );
}

export function createReservation(body: Record<string, any>) {
  return apiRequest<{ reservation: any }>("/api/admin/reservations", { method: "POST", body });
}

export function updateReservation(id: number, body: Record<string, any>) {
  return apiRequest<{ reservation: any }>(`/api/admin/reservations/${id}`, { method: "PATCH", body });
}

export function fetchTables() {
  return apiRequest<{ tables: any[]; summary: Record<string, number> }>("/api/admin/tables");
}

export function setTableStatus(id: number, status: string) {
  return apiRequest<{ table: any }>(`/api/admin/tables/${id}`, { method: "PATCH", body: { status } });
}

// ---------------------------------------------------------------------------
// Rewards / loyalty
// ---------------------------------------------------------------------------

export function fetchLoyaltyItems() {
  return apiRequest<{ items: any[] }>("/api/admin/loyalty/items");
}

export function createLoyaltyItem(body: Record<string, any>) {
  return apiRequest<{ item: any }>("/api/admin/loyalty/items", { method: "POST", body });
}

export function updateLoyaltyItem(id: number, body: Record<string, any>) {
  return apiRequest<{ item: any }>(`/api/admin/loyalty/items/${id}`, { method: "PUT", body });
}

export function deleteLoyaltyItem(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/loyalty/items/${id}`, { method: "DELETE" });
}

export function regenerateQrToken(itemId: number, tier: string) {
  return apiRequest<{ qrToken: string; qrTokens: Record<string, string> }>(
    `/api/admin/loyalty/items/${itemId}/qr/${tier}/regenerate`,
    { method: "POST" },
  );
}

export function fetchScans(params: { result?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params.result) q.set("result", params.result);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<{ scans: any[]; total: number; counts: Record<string, number> }>(
    `/api/admin/loyalty/scanlogs${qs ? `?${qs}` : ""}`,
  );
}

export function fetchVouchers(params: { state?: string; search?: string; limit?: number; page?: number }) {
  const q = new URLSearchParams();
  if (params.state) q.set("state", params.state);
  if (params.search) q.set("search", params.search);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.page) q.set("page", String(params.page));
  const qs = q.toString();
  return apiRequest<{ vouchers: any[]; total: number; page: number; counts: Record<string, number> }>(
    `/api/admin/loyalty/vouchers${qs ? `?${qs}` : ""}`,
  );
}

export function redeemVoucher(code: string) {
  return apiRequest<{ voucher: any }>("/api/admin/loyalty/redeem", { method: "POST", body: { code } });
}

export function fetchLoyaltyStats() {
  return apiRequest<{
    totals: Record<string, number>;
    byTier: Record<string, number>;
    items: any[];
  }>("/api/admin/loyalty/stats");
}

/** Generic image upload used by ImageField and the rewards reveal-layer
 * picker. `asset` is an expo-image-picker result asset. */
// ---------------------------------------------------------------------------
// Media (Media tab: restaurant gallery + customers' shared photos)
// ---------------------------------------------------------------------------

export function fetchAdminMedia(params: { source?: "restaurant" | "customer"; status?: "pending" | "approved" | "rejected" }) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString();
  return apiRequest<{ posts: any[]; pendingCount: number }>(`/api/admin/media${q ? `?${q}` : ""}`);
}

/** Restaurant photo — live on the Media tab straight away. */
export async function uploadRestaurantMedia(
  asset: { uri: string; fileName?: string | null; mimeType?: string | null; file?: File | null },
  caption?: string,
) {
  const form = new FormData();
  const type = asset.mimeType ?? "image/jpeg";
  const name = asset.fileName ?? `media-${Date.now()}.jpg`;
  if (Platform.OS === "web") {
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
    form.append("image", blob, name);
  } else {
    form.append("image", { uri: asset.uri, name, type } as unknown as Blob);
  }
  if (caption?.trim()) form.append("caption", caption.trim());
  return apiRequest<{ post: any }>("/api/admin/media", { method: "POST", body: form, isForm: true });
}

export function reviewMedia(id: number, status: "approved" | "rejected" | "pending") {
  return apiRequest<{ post: any }>(`/api/admin/media/${id}`, { method: "PATCH", body: { status } });
}

export function deleteMedia(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/media/${id}`, { method: "DELETE" });
}

export async function uploadImage(
  asset: { uri: string; fileName?: string | null; mimeType?: string | null; file?: File | null },
  folder: string,
): Promise<string> {
  const form = new FormData();
  const type = asset.mimeType ?? "image/jpeg";
  const name = asset.fileName ?? `upload-${Date.now()}.${type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"}`;
  if (Platform.OS === "web") {
    // A browser FormData only sends real Blob/File parts — the native `{ uri, name, type }` shape
    // below gets stringified to "[object Object]" and the server sees no file at all. The web
    // image picker hands back the File itself (or a blob:/data: URI we can read into one).
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
    form.append("file", blob, name);
  } else {
    // React Native's FormData accepts this file-like shape even though the DOM
    // FormData type doesn't describe it.
    form.append("file", { uri: asset.uri, name, type } as unknown as Blob);
  }
  form.append("folder", folder);
  const res = await apiRequest<{ path: string }>("/api/admin/uploads", {
    method: "POST",
    body: form,
    isForm: true,
  });
  return res.path;
}

// ---------------------------------------------------------------------------
// Suppliers + purchase orders
// ---------------------------------------------------------------------------

export function fetchSuppliers() {
  return apiRequest<{ suppliers: any[] }>("/api/admin/suppliers");
}

export function createSupplier(body: Record<string, any>) {
  return apiRequest<{ supplier: any }>("/api/admin/suppliers", { method: "POST", body });
}

export function updateSupplier(id: number, body: Record<string, any>) {
  return apiRequest<{ supplier: any }>(`/api/admin/suppliers/${id}`, { method: "PUT", body });
}

export function deleteSupplier(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/suppliers/${id}`, { method: "DELETE" });
}

export function fetchPurchaseOrders(params: { status?: string }) {
  const q = params.status ? `?status=${encodeURIComponent(params.status)}` : "";
  return apiRequest<{ orders: any[]; counts: Record<string, number> }>(`/api/admin/purchase-orders${q}`);
}

export function createPurchaseOrder(body: Record<string, any>) {
  return apiRequest<{ order: any }>("/api/admin/purchase-orders", { method: "POST", body });
}

export function setPurchaseOrderStatus(id: number, status: string) {
  return apiRequest<{ order: any }>(`/api/admin/purchase-orders/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function deletePurchaseOrder(id: number) {
  return apiRequest<{ ok: true }>(`/api/admin/purchase-orders/${id}`, { method: "DELETE" });
}
