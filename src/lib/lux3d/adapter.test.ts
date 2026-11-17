import { describe, expect, it, vi } from "vitest";
import { planDorm } from "../planner/plan.ts";
import { PRESETS } from "../planner/presets.ts";
import { demoPresentation, generateSequential, honestyCopy, requestFromAsset } from "./adapter.ts";
import { Lux3dClient } from "./client.ts";
import { concurrencyLimit, createSuccess, queryFailed, queryRunning, successG1Base, successG1WithPly, successNotRequested, textOnlyG1 } from "./fixtures.ts";
import { handleRequest } from "./handleRequest.ts";
import { parseCreateBody, parseQueryBody, pickDownloads, pollDecision, validateImgTo3dRequest, validateTextTo3dRequest } from "./protocol.ts";

const presetBrief = PRESETS[0]!.brief;

describe("Lux3D protocol", () => {
  it("parses the official create, concurrency, running, and G1 success fixtures", () => {
    expect(parseCreateBody(createSuccess)).toEqual({ ok: true, taskId: 1256173 });
    const limited = parseCreateBody(concurrencyLimit);
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.code).toBe("GENERATION_CONCURRENCY_LIMIT_EXCEEDED");
    const running = parseQueryBody(queryRunning);
    expect(running.ok && running.status).toBe(1);
    const success = parseQueryBody(successG1Base);
    expect(success.ok).toBe(true);
    if (success.ok) expect(success.downloads.glb).toBe("https://cdn.example.com/output/result.glb");
    const ply = parseQueryBody(successG1WithPly);
    if (ply.ok) {
      expect(ply.downloads.ply).toBe("https://cdn.example.com/output/result.ply");
      expect(ply.downloads.zip).toBe("https://cdn.example.com/output/results.zip");
    }
    expect(pickDownloads(successNotRequested.d.outputs).glb).toBe("https://cdn.example.com/output/textured.glb");
    expect(pickDownloads([{ content: "NOT_REQUESTED" }, { content: "" }, { content: null }])).toEqual({});
    expect(parseQueryBody(queryFailed).ok && pollDecision(4)).toBe("failed");
    expect(pollDecision(0)).toBe("wait");
    expect(pollDecision(1)).toBe("wait");
    expect(pollDecision(3)).toBe("success");
    expect(pollDecision(6)).toBe("canceled");
  });

  it("rejects a face count outside the OpenAPI range and img/imgs together", () => {
    expect(() => validateTextTo3dRequest({ ...textOnlyG1, faceCount: 999 })).toThrow(/faceCount/);
    expect(() => validateImgTo3dRequest({ img: "https://example.com/a.jpg", imgs: ["https://example.com/b.jpg"], version: "G1" })).toThrow(/exactly one/);
    const img = validateImgTo3dRequest({ img: "https://example.com/a.jpg", version: "G1-Turbo", outputFormat: ["glb"] });
    expect(img.imgs).toBeUndefined();
    expect(img.version).toBe("G1-Turbo");
  });

  it("sends Authorization without Bearer and the documented paths", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: { headers?: Record<string, string>; method?: string; body?: string }) => {
      expect(init?.headers?.Authorization).toBe("test-key");
      expect(init?.headers?.Authorization?.startsWith("Bearer ")).toBe(false);
      if (String(url).includes("text-to-3d")) return { ok: true, status: 200, json: async () => createSuccess };
      return { ok: true, status: 200, json: async () => successG1Base };
    });
    const client = new Lux3dClient(fetchImpl, { gateway: "https://api.aholo.ai", apiKey: "test-key" });
    const created = await client.createTextTo3d(textOnlyG1);
    expect(created).toEqual({ ok: true, taskId: 1256173 });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe("https://api.aholo.ai/global/lux3d/v1/generate/text-to-3d/task/create");
    const task = await client.getTask(1389515);
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain("/global/lux3d/v1/generate/task/get?taskid=1389515");
    expect(task.ok && task.downloads.glb).toBeTruthy();
  });
});

describe("demo mode", () => {
  it("does not call the network or reuse documentation URLs as models", async () => {
    const plan = planDorm(presetBrief);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const demo = demoPresentation(plan.plan);
    expect(demo.mode).toBe("demo");
    expect(demo.assets.every((asset) => asset.modelUrl === null && asset.source === "procedural-stand-in")).toBe(true);
    const blob = JSON.stringify(demo.assets);
    expect(blob).not.toContain("cdn.example.com/output/result.glb");
    expect(blob).not.toContain("1256173");
    expect(demo.officialExamples.createSuccess.d).toBe(1256173);
    const fetchImpl = vi.fn();
    const health = await handleRequest({ method: "GET", path: "/api/health", env: {}, fetchImpl });
    expect(health.json).toMatchObject({ mode: "demo", hasKey: false, keyExposed: false, gateway: "https://api.aholo.ai" });
    const denied = await handleRequest({ method: "POST", path: "/api/lux3d/text-to-3d", body: requestFromAsset(plan.plan.luxAssets[0]!), env: {}, fetchImpl });
    expect(denied.status).toBe(409);
    expect(denied.json).toMatchObject({ error: "DEMO_MODE" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses a Vite-prefixed key and can describe mixed sources", async () => {
    const response = await handleRequest({ method: "GET", path: "/api/health", env: { VITE_AHOLO_API_KEY: "nope", AHOLO_REGION: "cn" } });
    expect(response.json).toMatchObject({ mode: "demo", region: "cn", gateway: "https://api.aholo.cn" });
    expect(JSON.stringify(response.json)).toContain("VITE_AHOLO_API_KEY");
    expect(JSON.stringify(response.json)).not.toContain("nope");
    expect(honestyCopy({ standIn: 3, live: 0, pasted: 0 }, "zh").shortZh).toBe("演示替身");
    expect(honestyCopy({ standIn: 1, live: 1, pasted: 1 }, "en").shortEn).toBe("Mixed");
  });
});

describe("sequential generation", () => {
  it("does not start the next task until the previous one succeeds, and retries concurrency", async () => {
    const calls: string[] = [];
    let polls = 0;
    const transport = {
      async createTextTo3d() {
        calls.push("create");
        if (calls.filter((call) => call === "create").length === 2) {
          return { ok: false as const, error: "CONCURRENCY", code: "GENERATION_CONCURRENCY_LIMIT_EXCEEDED", message: "busy" };
        }
        return { ok: true as const, taskId: calls.length };
      },
      async getTask(taskId: number) {
        calls.push(`get:${taskId}`);
        polls += 1;
        if (polls % 2 === 1) return { ok: true as const, taskId, status: 1 as const, outputs: [], downloads: {} };
        return { ok: true as const, taskId, status: 3 as const, outputs: [{ content: `https://cdn.example.com/${taskId}.glb` }], downloads: { glb: `https://cdn.example.com/${taskId}.glb` } };
      },
    };
    let now = 0;
    const updates: string[] = [];
    const results = await generateSequential({
      jobs: [
        { id: "chair", request: textOnlyG1 },
        { id: "lamp", request: textOnlyG1 },
      ],
      transport,
      sleep: async (ms) => {
        now += ms;
      },
      intervalMs: 12,
      timeoutMs: 100,
      now: () => now,
      concurrencyRetries: 2,
      onUpdate: (update) => updates.push(`${update.id}:${update.phase}`),
    });
    expect(results.map((result) => result.phase)).toEqual(["succeeded", "succeeded"]);
    const firstSuccess = calls.indexOf("get:1");
    const secondCreate = calls.indexOf("create", calls.indexOf("create") + 1);
    expect(firstSuccess).toBeGreaterThan(-1);
    expect(secondCreate).toBeGreaterThan(firstSuccess);
    expect(results[1]?.glbUrl).toContain(".glb");
    expect(updates).toContain("chair:succeeded");
  });

  it("records a failure and still continues to the next job", async () => {
    const transport = {
      async createTextTo3d() {
        return { ok: true as const, taskId: 4 };
      },
      async getTask() {
        return parseQueryBody(queryFailed);
      },
    };
    const results = await generateSequential({
      jobs: [
        { id: "a", request: textOnlyG1 },
        { id: "b", request: textOnlyG1 },
      ],
      transport,
      sleep: async () => undefined,
      intervalMs: 1,
      timeoutMs: 5,
      now: () => 0,
    });
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.phase === "failed")).toBe(true);
  });
});
