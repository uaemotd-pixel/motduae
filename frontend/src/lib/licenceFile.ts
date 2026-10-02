import { api } from "@/lib/api/client";

export async function openLicenceFile(endpoint: string) {
  const blob = await api.getBlob(endpoint);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function loadLicencePreview(endpoint: string) {
  const blob = await api.getBlob(endpoint);
  return URL.createObjectURL(blob);
}
