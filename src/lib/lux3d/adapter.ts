import { OFFICIAL_EXAMPLES } from "./fixtures.ts";
import { pollDecision } from "./protocol.ts";
import type { CreateResult, QueryResult, TextTo3dRequest } from "./types.ts";
import type { LuxAssetSpec, Plan } from "../planner/types.ts";

export type AssetSource = "procedural-stand-in" | "lux3d-task" | "pasted-url";

export type DemoAsset = {
  id: string;
  nameZh: string;
  nameEn: string;
  request: TextTo3dRequest;
  modelUrl: null;
  source: "procedural-stand-in";
};

export function requestFromAsset(asset: LuxAssetSpec): TextTo3dRequest {
  return {
    prompt: asset.prompt,
    style: asset.style,
    version: asset.version,
    faceCount: asset.faceCount,
    outputFormat: asset.outputFormat,
    enablePbr: asset.enablePbr,
    aiPredictSize: asset.aiPredictSize,
    img: asset.referenceUrl,
  };
}

/** Demo mode never copies documentation URLs into the scene. */
export function demoPresentation(plan: Plan): { mode: "demo"; assets: DemoAsset[]; officialExamples: typeof OFFICIAL_EXAMPLES; noticeZh: string; noticeEn: string } {
  return {
    mode: "demo",
    assets: plan.luxAssets.map((asset) => ({
      id: asset.id,
      nameZh: asset.nameZh,
      nameEn: asset.nameEn,
      request: requestFromAsset(asset),
      modelUrl: null,
      source: "procedural-stand-in",
    })),
    officialExamples: OFFICIAL_EXAMPLES,
    noticeZh: "下面的示例响应来自 Aholo 官方 OpenAPI 文档，不是这次寝室的生成结果。",
    noticeEn: "The sample responses below are from Aholo's official OpenAPI document. They are not this dorm's generation.",
  };
}

export type GenerationTransport = {
  createTextTo3d: (body: TextTo3dRequest) => Promise<CreateResult>;
  getTask: (taskId: number) => Promise<QueryResult>;
};

export type JobUpdate = {
  id: string;
  phase: "queued" | "running" | "succeeded" | "failed" | "canceled" | "timeout";
  taskId?: number;
  glbUrl?: string;
  message?: string;
};

export async function generateSequential(options: {
  jobs: Array<{ id: string; request: TextTo3dRequest }>;
  transport: GenerationTransport;
  sleep: (ms: number) => Promise<void>;
  intervalMs: number;
  timeoutMs: number;
  now: () => number;
  onUpdate?: (update: JobUpdate) => void;
  concurrencyRetries?: number;
}): Promise<JobUpdate[]> {
  const results: JobUpdate[] = [];
  for (const job of options.jobs) {
    options.onUpdate?.({ id: job.id, phase: "queued" });
    const created = await createWithRetry(job.request, options);
    if (!created.ok) {
      const update: JobUpdate = { id: job.id, phase: "failed", message: created.message };
      options.onUpdate?.(update);
      results.push(update);
      continue;
    }
    const started = options.now();
    let finished: JobUpdate | null = null;
    while (options.now() - started <= options.timeoutMs) {
      const task = await options.transport.getTask(created.taskId);
      if (!task.ok) {
        finished = { id: job.id, phase: "failed", taskId: created.taskId, message: task.message };
        break;
      }
      const decision = pollDecision(task.status);
      if (decision === "wait") {
        options.onUpdate?.({ id: job.id, phase: "running", taskId: task.taskId });
        await options.sleep(options.intervalMs);
        continue;
      }
      if (decision === "success") {
        finished = { id: job.id, phase: "succeeded", taskId: task.taskId, glbUrl: task.downloads.glb, message: task.downloads.glb ? undefined : "Task succeeded without a GLB URL." };
      } else if (decision === "canceled") {
        finished = { id: job.id, phase: "canceled", taskId: task.taskId, message: "Lux3D canceled the task." };
      } else {
        finished = { id: job.id, phase: "failed", taskId: task.taskId, message: "Lux3D marked the task as failed." };
      }
      break;
    }
    const update = finished ?? { id: job.id, phase: "timeout" as const, taskId: created.taskId, message: "Polling timed out before Lux3D finished." };
    options.onUpdate?.(update);
    results.push(update);
  }
  return results;
}

async function createWithRetry(request: TextTo3dRequest, options: { transport: GenerationTransport; sleep: (ms: number) => Promise<void>; intervalMs: number; concurrencyRetries?: number }): Promise<CreateResult> {
  const retries = options.concurrencyRetries ?? 3;
  let attempt = 0;
  while (true) {
    const created = await options.transport.createTextTo3d(request);
    if (created.ok || created.error !== "CONCURRENCY" || attempt >= retries) return created;
    attempt += 1;
    await options.sleep(options.intervalMs);
  }
}

export function honestyCopy(counts: { standIn: number; live: number; pasted: number }, lang: "zh" | "en"): { shortZh: string; shortEn: string; long: string } {
  const { standIn, live, pasted } = counts;
  let shortZh = "演示替身";
  let shortEn = "Stand-in";
  let long = lang === "zh" ? "房间里的家具是本地程序化替身，不是 Lux3D 生成结果。" : "The furniture is a local procedural stand-in, not a Lux3D result.";
  if (live > 0 && standIn === 0 && pasted === 0) {
    shortZh = "Lux3D";
    shortEn = "Lux3D";
    long = lang === "zh" ? "这些可替换家具来自本机密钥提交的 Lux3D 任务。" : "These swappable pieces came back from Lux3D tasks submitted with the local key.";
  } else if (pasted > 0 && live === 0 && standIn === 0) {
    shortZh = "外部链接";
    shortEn = "External URL";
    long = lang === "zh" ? "模型是手动贴入的链接，来源未核验。" : "These models were pasted in by URL. Their origin was not verified.";
  } else if (live + pasted > 0) {
    shortZh = "部分替身";
    shortEn = "Mixed";
    long = lang === "zh"
      ? `有 ${live} 件来自 Lux3D 任务，${pasted} 件是未核验链接，${standIn} 件仍是演示替身。`
      : `${live} from Lux3D tasks, ${pasted} pasted URLs (not verified), ${standIn} still stand-ins.`;
  }
  return { shortZh, shortEn, long };
}
