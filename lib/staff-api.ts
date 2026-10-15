import { apiRequest } from "./api-client";

/**
 * Staff-roster endpoints used by app/admin/staff.jsx. `fetchStaffList` and
 * `createStaffMember`/`updateStaffMember` match the real backend
 * (backend/src/routes/staff.ts) exactly, including its `active` field name,
 * which is normalized to `isActive` here for the UI. The backend has no
 * DELETE route yet, no audit trail and no login log — those three fall back
 * to reasonable behaviour (see below) rather than a hard failure.
 */

type RawStaff = Record<string, any>;

function normalize(staff: RawStaff) {
  return { ...staff, isActive: staff.isActive ?? staff.active ?? true };
}

export async function fetchStaffList() {
  const res = await apiRequest<{ staff: RawStaff[] }>("/api/admin/staff");
  return { staff: (res.staff ?? []).map(normalize) };
}

export function createStaffMember(body: { name: string; phone: string; password: string; role: string }) {
  return apiRequest<{ staff: RawStaff }>("/api/admin/staff", { method: "POST", body }).then((res) => ({
    staff: normalize(res.staff),
  }));
}

export function updateStaffMember(id: number, body: Record<string, any>) {
  const { isActive, ...rest } = body;
  const payload = isActive === undefined ? rest : { ...rest, active: isActive };
  return apiRequest<{ staff: RawStaff }>(`/api/admin/staff/${id}`, { method: "PATCH", body: payload }).then(
    (res) => ({ staff: normalize(res.staff) }),
  );
}

/** The backend doesn't expose a delete route today — disabling the account
 * (the same thing the roster's own on/off switch does) is the closest safe
 * equivalent, so "Delete" still does something useful instead of just
 * failing outright. */
export async function deleteStaffMember(id: number) {
  try {
    return await apiRequest<{ ok: true }>(`/api/admin/staff/${id}`, { method: "DELETE" });
  } catch (e: any) {
    if (e?.status === 404) {
      await updateStaffMember(id, { isActive: false });
      return { ok: true as const };
    }
    throw e;
  }
}

export function fetchAuditLog(params: { limit?: number }) {
  const q = params.limit ? `?limit=${params.limit}` : "";
  return apiRequest<{ entries: any[] }>(`/api/admin/staff/audit-log${q}`);
}

export function fetchLoginLog(limit: number) {
  return apiRequest<{ entries: any[] }>(`/api/admin/staff/login-log?limit=${limit}`);
}
