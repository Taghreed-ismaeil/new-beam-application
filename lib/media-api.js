import { Platform } from "react-native";

import { apiRequest } from "@/lib/api-client";

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

/** A photo's comments, oldest first — each with its `replies` underneath. */
export function fetchMediaComments(id) {
  return apiRequest(`/api/media/${id}/comments`);
}

/**
 * Comments on a photo, or — with replyTo (a comment id) — replies to a comment,
 * @mentioning its author. Returns { comment, commentCount }.
 */
export function postMediaComment(id, body, replyTo) {
  return apiRequest(`/api/media/${id}/comments`, {
    method: "POST",
    body: replyTo ? { body, replyTo } : { body },
  });
}

/** Like / unlike a comment — returns { liked, likeCount }. */
export function toggleCommentLike(postId, commentId) {
  return apiRequest(`/api/media/${postId}/comments/${commentId}/like`, {
    method: "POST",
  });
}

/** The signed-in customer removes one of their own comments. */
export function deleteMediaComment(postId, commentId) {
  return apiRequest(`/api/media/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

/** The signed-in customer hides (archived=true) or shows again one of their own photos. */
export function archiveMyMedia(id, archived) {
  return apiRequest(`/api/media/${id}/archive`, {
    method: "PATCH",
    body: { archived },
  });
}
