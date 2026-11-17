import { Lux3dClient, type FetchLike } from "./client.ts";
import { clampFaceCount, gatewayForRegion, parseVersion, pickDownloads, validateImgTo3dRequest, validateTextTo3dRequest } from "./protocol.ts";
import type { ImgTo3dRequest, LuxRuntimeConfig, QueryResult, ServerEnv, TextTo3dRequest } from "./types.ts";

export type ApiResponse = { status: number; json: unknown };

export function readLuxConfig(env: ServerEnv): LuxRuntimeConfig {
  let gateway: { region: "com" | "cn"; gateway: string };
  try {
    gateway = gatewayForRegion(env.AHOLO_REGION, env.AHOLO_API_BASE);
  } catch (error) {
    gateway = { region: "com", gateway: "https://api.aholo.ai" };
    return {
      apiKey: "",
      region: gateway.region,
      gateway: gateway.gateway,
      version: "G1",
      faceCount: 120_000,
      mode: "demo",
      keyExposed: false,
      warning: error instanceof Error ? error.message : "Invalid AHOLO_API_BASE.",
    };
  }
  const apiKey = env.AHOLO_API_KEY?.trim() ?? "";
  const warning = env.VITE_AHOLO_API_KEY
    ? "VITE_AHOLO_API_KEY is set. That name would ship the key to the browser. Rename it to AHOLO_API_KEY. This server ignores the VITE_ value."
    : undefined;
  return {
    apiKey,
    region: gateway.region,
    gateway: gateway.gateway,
    version: parseVersion(env.LUX3D_VERSION),
    faceCount: clampFaceCount(env.LUX3D_FACE_COUNT === undefined ? 120_000 : Number(env.LUX3D_FACE_COUNT)),
    mode: apiKey ? "live" : "demo",
    keyExposed: false,
    warning,
  };
}

export async function handleRequest(input: { method: string; path: string; body?: unknown; env: ServerEnv; fetchImpl?: FetchLike }): Promise<ApiResponse> {
  const config = readLuxConfig(input.env);
  const url = new URL(input.path, "http://dorm-remix.local");
  if (input.method === "GET" && url.pathname === "/api/health") {
    return {
      status: 200,
      json: {
        ok: true,
        mode: config.mode,
        hasKey: config.mode === "live",
        region: config.region,
        gateway: config.gateway,
        version: config.version,
        faceCount: config.faceCount,
        keyExposed: false,
        warning: config.warning,
      },
    };
  }

  const taskMatch = url.pathname.match(/^\/api\/lux3d\/tasks\/(\d+)(?:\/file)?$/);
  if (!config.apiKey) {
    return { status: 409, json: { ok: false, error: "DEMO_MODE", message: "No AHOLO_API_KEY is configured. Refusing to invent a Lux3D response." } };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const client = new Lux3dClient(fetchImpl, { gateway: config.gateway, apiKey: config.apiKey });

  if (input.method === "POST" && url.pathname === "/api/lux3d/text-to-3d") {
    return createText(client, input.body);
  }
  if (input.method === "POST" && url.pathname === "/api/lux3d/img-to-3d") {
    return createImage(client, input.body);
  }
  if (input.method === "GET" && taskMatch && !url.pathname.endsWith("/file")) {
    const task = await client.getTask(Number(taskMatch[1]));
    return taskResponse(task);
  }
  if (input.method === "GET" && taskMatch && url.pathname.endsWith("/file")) {
    const task = await client.getTask(Number(taskMatch[1]));
    if (!task.ok) return taskResponse(task);
    const glb = task.downloads.glb;
    if (!glb) return { status: 404, json: { ok: false, error: "NO_GLB", message: "This task has no GLB URL yet." } };
    return { status: 200, json: { ok: true, url: glb, taskId: task.taskId, source: "lux3d-task" } };
  }
  return { status: 404, json: { ok: false, error: "NOT_FOUND", message: "Unknown Lux3D route." } };
}

async function createText(client: Lux3dClient, body: unknown): Promise<ApiResponse> {
  try {
    const request = validateTextTo3dRequest(body as TextTo3dRequest);
    return finishCreate(await client.createTextTo3d(request), request);
  } catch (error) {
    return validationError(error);
  }
}

async function createImage(client: Lux3dClient, body: unknown): Promise<ApiResponse> {
  try {
    const request = validateImgTo3dRequest(body as ImgTo3dRequest);
    return finishCreate(await client.createImgTo3d(request), request);
  } catch (error) {
    return validationError(error);
  }
}

function finishCreate(created: Awaited<ReturnType<Lux3dClient["createTextTo3d"]>>, request: unknown): ApiResponse {
  if (!created.ok && created.error === "CONCURRENCY") return { status: 429, json: created };
  if (!created.ok && created.error === "UNAUTHORIZED") return { status: 401, json: created };
  if (!created.ok) return { status: 502, json: created };
  return { status: 200, json: { ...created, echoedRequest: request } };
}

function validationError(error: unknown): ApiResponse {
  return { status: 400, json: { ok: false, error: "VALIDATION", message: error instanceof Error ? error.message : "Invalid request." } };
}

function taskResponse(task: QueryResult): ApiResponse {
  if (!task.ok && task.error === "UNAUTHORIZED") return { status: 401, json: task };
  if (!task.ok) return { status: 502, json: task };
  return { status: 200, json: { ...task, downloads: task.downloads ?? pickDownloads(task.outputs) } };
}
