import type { CreateResult, ImgTo3dRequest, QueryResult, TextTo3dRequest } from "./types.ts";

export type Health = {
  ok: boolean;
  mode: "live" | "demo";
  hasKey: boolean;
  region: "com" | "cn";
  gateway: string;
  version: "G1" | "G1-Turbo";
  faceCount: number;
  keyExposed: false;
  warning?: string;
};

function url(path: string): string {
  const base = import.meta.env.BASE_URL || "./";
  return `${base}${path.replace(/^\//, "")}`;
}

export async function fetchHealth(): Promise<Health | null> {
  try {
    const response = await fetch(url("api/health"), { headers: { accept: "application/json" } });
    if (!response.ok) return null;
    const json = (await response.json()) as Health;
    if (!json || (json.mode !== "live" && json.mode !== "demo")) return null;
    return json;
  } catch {
    return null;
  }
}

export async function postTextTo3d(body: TextTo3dRequest): Promise<CreateResult> {
  return post("api/lux3d/text-to-3d", body);
}

export async function postImgTo3d(body: ImgTo3dRequest): Promise<CreateResult> {
  return post("api/lux3d/img-to-3d", body);
}

export async function fetchTask(taskId: number): Promise<QueryResult> {
  try {
    const response = await fetch(url(`api/lux3d/tasks/${taskId}`), { headers: { accept: "application/json" } });
    const json = (await response.json()) as QueryResult;
    return json;
  } catch {
    return { ok: false, error: "NETWORK", message: "Could not reach the local Lux3D proxy." };
  }
}

export function taskFileUrl(taskId: number): string {
  return url(`api/lux3d/tasks/${taskId}/file`);
}

async function post(path: string, body: unknown): Promise<CreateResult> {
  try {
    const response = await fetch(url(path), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as CreateResult;
    return json;
  } catch {
    return { ok: false, error: "NETWORK", message: "Could not reach the local Lux3D proxy." };
  }
}
