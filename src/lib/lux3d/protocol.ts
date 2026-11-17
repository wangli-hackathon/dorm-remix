import type { Downloads, ImgTo3dRequest, LuxVersion, OutputFormat, QueryResult, TaskOutput, TaskStatus, TextTo3dRequest } from "./types.ts";

const STYLES = new Set(["photorealistic", "cartoon", "anime", "hand_painted", "cyberpunk", "fantasy", "glass"]);
const FORMATS = new Set(["zip", "glb", "ply"]);

export function clampFaceCount(value: number): number {
  if (!Number.isFinite(value)) return 120_000;
  return Math.min(300_000, Math.max(10_000, Math.round(value)));
}

export function parseVersion(value: string | undefined): LuxVersion {
  return value === "G1-Turbo" ? "G1-Turbo" : "G1";
}

export function gatewayForRegion(region: string | undefined, override?: string): { region: "com" | "cn"; gateway: string } {
  const trimmed = override?.trim().replace(/\/$/, "");
  if (trimmed) {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") throw new Error("AHOLO_API_BASE must be https.");
    return { region: region === "cn" ? "cn" : "com", gateway: parsed.origin };
  }
  if (region === "cn") return { region: "cn", gateway: "https://api.aholo.cn" };
  return { region: "com", gateway: "https://api.aholo.ai" };
}

export function validateTextTo3dRequest(input: TextTo3dRequest): TextTo3dRequest {
  const prompt = input.prompt?.trim() ?? "";
  if (!prompt) throw new Error("prompt is required.");
  if (input.style && !STYLES.has(input.style)) throw new Error("style is not a Lux3D style.");
  if (input.version && input.version !== "G1" && input.version !== "G1-Turbo") throw new Error("version must be G1 or G1-Turbo.");
  if (input.faceCount !== undefined && (input.faceCount < 10_000 || input.faceCount > 300_000)) {
    throw new Error("faceCount must be between 10000 and 300000.");
  }
  if (input.img !== undefined && !isHttpsUrl(input.img)) throw new Error("img must be an https URL.");
  const outputFormat = cleanFormats(input.outputFormat);
  return {
    prompt,
    style: input.style ?? "photorealistic",
    version: input.version ?? "G1",
    faceCount: input.faceCount === undefined ? undefined : input.faceCount,
    outputFormat,
    enablePbr: input.enablePbr ?? true,
    aiPredictSize: input.aiPredictSize ?? true,
    img: input.img,
  };
}

export function validateImgTo3dRequest(input: ImgTo3dRequest): ImgTo3dRequest {
  const hasImg = Boolean(input.img);
  const hasImgs = Boolean(input.imgs && input.imgs.length > 0);
  if (hasImg === hasImgs) throw new Error("Provide exactly one of img or imgs.");
  if (input.img && !isHttpsUrl(input.img)) throw new Error("img must be an https URL.");
  if (input.imgs && (input.imgs.length < 1 || input.imgs.length > 32 || input.imgs.some((item) => !isHttpsUrl(item)))) {
    throw new Error("imgs must be 1 to 32 https URLs.");
  }
  if (input.version && input.version !== "G1" && input.version !== "G1-Turbo") throw new Error("version must be G1 or G1-Turbo.");
  if (input.faceCount !== undefined && (input.faceCount < 10_000 || input.faceCount > 300_000)) {
    throw new Error("faceCount must be between 10000 and 300000.");
  }
  return {
    img: input.img,
    imgs: input.imgs,
    version: input.version ?? "G1",
    faceCount: input.faceCount,
    outputFormat: cleanFormats(input.outputFormat),
    enablePbr: input.enablePbr ?? true,
    aiPredictSize: input.aiPredictSize ?? true,
  };
}

export function parseCreateBody(body: unknown): { ok: true; taskId: number } | { ok: false; code: string; message: string } {
  const record = asRecord(body);
  if (!record) return { ok: false, code: "MALFORMED", message: "Create response was not an object." };
  const code = typeof record.c === "string" ? record.c : "MALFORMED";
  const message = typeof record.m === "string" ? record.m : "";
  if (code !== "0") return { ok: false, code, message: message || code };
  if (typeof record.d !== "number") return { ok: false, code: "MALFORMED", message: "Create response did not include a task id." };
  return { ok: true, taskId: record.d };
}

export function parseQueryBody(body: unknown): QueryResult {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "MALFORMED", message: "Task response was not an object." };
  const code = typeof record.c === "string" ? record.c : "MALFORMED";
  const message = typeof record.m === "string" ? record.m : "";
  if (code !== "0") return { ok: false, error: "UPSTREAM", code, message: message || code };
  const data = asRecord(record.d);
  if (!data || typeof data.taskId !== "number" || !isStatus(data.status)) {
    return { ok: false, error: "MALFORMED", message: "Task payload was missing taskId or status." };
  }
  const outputs = Array.isArray(data.outputs) ? data.outputs.filter(isOutput) : [];
  return { ok: true, taskId: data.taskId, status: data.status, outputs, downloads: pickDownloads(outputs) };
}

export function pickDownloads(outputs: readonly TaskOutput[]): Downloads {
  const downloads: Downloads = {};
  for (const output of outputs) {
    const content = output.content?.trim();
    if (!content || content === "NOT_REQUESTED") continue;
    if (!/^https:\/\//.test(content)) continue;
    const path = content.split("?")[0]?.toLowerCase() ?? "";
    if (path.endsWith(".glb") && !downloads.glb) downloads.glb = content;
    else if (path.endsWith(".zip") && !downloads.zip) downloads.zip = content;
    else if (path.endsWith(".ply") && !downloads.ply) downloads.ply = content;
  }
  return downloads;
}

export function pollDecision(status: TaskStatus): "wait" | "success" | "failed" | "canceled" {
  if (status === 0 || status === 1) return "wait";
  if (status === 3) return "success";
  if (status === 6) return "canceled";
  return "failed";
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function cleanFormats(formats: readonly OutputFormat[] | undefined): OutputFormat[] | undefined {
  if (!formats) return undefined;
  const unique = [...new Set(formats)];
  if (unique.some((format) => !FORMATS.has(format))) throw new Error("outputFormat only allows zip, glb, and ply.");
  return unique;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isStatus(value: unknown): value is TaskStatus {
  return value === 0 || value === 1 || value === 3 || value === 4 || value === 6;
}

function isOutput(value: unknown): value is TaskOutput {
  if (!value || typeof value !== "object") return false;
  const content = (value as { content?: unknown }).content;
  return content === undefined || content === null || typeof content === "string";
}
