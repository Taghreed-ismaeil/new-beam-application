import { Platform } from "react-native";

import { apiRequest } from "@/lib/api-client";

/* =========================================================
   MEDIA API
   Media tab: the restaurant's gallery (source "restaurant") and
   photos customers share (source "customer", shown once staff
   approve them). Backend: /api/media, /api/admin/media.
========================================================= */

/** One page of approved photos, newest first. */
export function fetchMediaPage(source, cursor) {
  const q = `source=${source}${cursor ? `&cursor=${cursor}` : ""}`;
  return apiRequest(`/api/media?${q}`);
}

/** The signed-in customer's own shared photos, with their review status. */
export function fetchMyMedia() {
  return apiRequest("/api/media/mine");
}

export function deleteMyMedia(id) {
  return apiRequest(`/api/media/${id}`, { method: "DELETE" });
}

/**
 * Builds the multipart body for a photo picked with expo-image-picker. On web
 * the picker hands back a blob:/data: URI, which FormData can't take as
 * {uri,name,type} — it has to be turned into a real Blob first.
 */
export async function photoForm(asset, caption) {
  const form = new FormData();
  const name = asset.fileName || `photo-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  if (Platform.OS === "web") {
    const blob = await (await fetch(asset.uri)).blob();
    form.append("image", blob, name);
  } else {
    form.append("image", { uri: asset.uri, name, type });
  }
  if (caption?.trim()) form.append("caption", caption.trim());
  return form;
}

/** Customer shares a photo — it waits for staff approval. */
export async function shareMedia(asset, caption) {
  const body = await photoForm(asset, caption);
  return apiRequest("/api/media", { method: "POST", body, isForm: true });
}

/** Like / unlike a photo — returns { liked, likeCount }. */
export function toggleMediaLike(id) {
  return apiRequest(`/api/media/${id}/like`, { method: "POST" });
}

/** A photo's comments, oldest first. */
export function fetchMediaComments(id) {
  return apiRequest(`/api/media/${id}/comments`);
}

export function postMediaComment(id, body) {
  return apiRequest(`/api/media/${id}/comments`, { method: "POST", body: { body } });
}

/** The signed-in customer removes one of their own comments. */
export function deleteMediaComment(postId, commentId) {
  return apiRequest(`/api/media/${postId}/comments/${commentId}`, { method: "DELETE" });
}

/** The signed-in customer hides (archived=true) or shows again one of their own photos. */
export function archiveMyMedia(id, archived) {
  return apiRequest(`/api/media/${id}/archive`, { method: "PATCH", body: { archived } });
}
