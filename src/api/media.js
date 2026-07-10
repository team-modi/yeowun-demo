/**
 * 미디어 업로드 — Cloudflare Worker 프리사인 + R2 직접 PUT.
 * 스프링 백엔드는 R2 를 모른다: Worker(/presign)가 R2 presigned PUT URL 을 발급하고,
 * 브라우저가 파일 바이트를 R2 로 직접 올린 뒤, 영구 URL(fileUrl)만 기록에 저장한다.
 *
 * 흐름: FE → Worker /presign → PUT uploadUrl(raw bytes, no credentials) → 200 이면 fileUrl 확정.
 * 프리사인 엔드포인트는 공개값(비밀 아님)이라 하드코딩 기본값을 두고 env 로 덮어쓸 수 있다.
 */

const PRESIGN_URL =
  import.meta.env.VITE_MEDIA_PRESIGN_URL ||
  "https://yeowun-media-presign.yeowun-tjtfy.workers.dev/presign";

// 클라이언트 사이드 용량 제한(서버도 강제하지만 UX 를 위해 먼저 막는다).
export const IMAGE_MAX_BYTES = 15 * 1024 * 1024; // 15MB
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50MB

/** file.type 으로 미디어 종류 판별. 이미지/영상 외에는 null. */
export function mediaKind(contentType = "") {
  if (contentType.startsWith("image/")) return "PHOTO";
  if (contentType.startsWith("video/")) return "VIDEO";
  return null;
}

/** 업로드 전 클라 검증 — 통과하면 null, 아니면 사용자용 에러 메시지 반환. */
export function validateMediaFile(file) {
  const kind = mediaKind(file?.type || "");
  if (!kind) return "이미지 또는 영상 파일만 올릴 수 있어요.";
  const limit = kind === "VIDEO" ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    const label = kind === "VIDEO" ? "영상" : "사진";
    return `${label}은 ${mb}MB 이하만 올릴 수 있어요.`;
  }
  return null;
}

/**
 * Worker 에 프리사인 요청. credentials 없이 raw fetch.
 * 200 → { uploadUrl, fileUrl, key, type, contentType }. 비 2xx 는 서버 메시지로 throw.
 */
export async function presignMedia({ contentType, size }) {
  const res = await fetch(PRESIGN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, size }),
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new Error(json?.message || `프리사인 발급 실패(${res.status})`);
  }
  return json;
}

/** R2 presigned PUT URL 로 파일 바이트 직접 업로드(no credentials). */
export async function uploadToR2(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("R2 업로드 실패(" + res.status + ")");
}

/**
 * 프리사인 → R2 PUT → 기록 미디어 항목 반환.
 * 반환: { type, url, sizeBytes } — RecordMediaRequest 로 그대로 전송 가능.
 */
export async function uploadRecordMedia(file) {
  const invalid = validateMediaFile(file);
  if (invalid) throw new Error(invalid);
  const { uploadUrl, fileUrl, type } = await presignMedia({
    contentType: file.type,
    size: file.size,
  });
  await uploadToR2(uploadUrl, file);
  return { type: type || mediaKind(file.type), url: fileUrl, sizeBytes: file.size };
}
