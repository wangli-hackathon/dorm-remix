import { parseCreateBody, parseQueryBody } from "./protocol.ts";
import type { CreateResult, ImgTo3dRequest, QueryResult, TextTo3dRequest } from "./types.ts";

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export class Lux3dClient {
  private readonly fetchImpl: FetchLike;
  private readonly options: { gateway: string; apiKey: string };

  constructor(fetchImpl: FetchLike, options: { gateway: string; apiKey: string }) {
    this.fetchImpl = fetchImpl;
    this.options = options;
  }

  async createTextTo3d(body: TextTo3dRequest): Promise<CreateResult> {
    return this.create("/global/lux3d/v1/generate/text-to-3d/task/create", body);
  }

  async createImgTo3d(body: ImgTo3dRequest): Promise<CreateResult> {
    return this.create("/global/lux3d/v1/generate/img-to-3d/task/create", body);
  }

  async getTask(taskId: number): Promise<QueryResult> {
    const response = await this.fetchImpl(`${this.options.gateway}/global/lux3d/v1/generate/task/get?taskid=${encodeURIComponent(String(taskId))}`, {
      method: "GET",
      headers: this.headers(),
    });
    if (response.status === 401) return { ok: false, error: "UNAUTHORIZED", message: "Aholo rejected the API key (HTTP 401)." };
    if (response.status === 429) return { ok: false, error: "RATE_LIMIT", message: "Aholo rate-limited the request (HTTP 429)." };
    const json = await response.json();
    return parseQueryBody(json);
  }

  private async create(path: string, body: unknown): Promise<CreateResult> {
    const response = await this.fetchImpl(`${this.options.gateway}${path}`, {
      method: "POST",
      headers: { ...this.headers(), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 401) return { ok: false, error: "UNAUTHORIZED", code: "401", message: "Aholo rejected the API key (HTTP 401)." };
    if (response.status === 429) return { ok: false, error: "RATE_LIMIT", code: "429", message: "Aholo rate-limited the request (HTTP 429)." };
    const json = await response.json();
    const parsed = parseCreateBody(json);
    if (!parsed.ok && parsed.code === "GENERATION_CONCURRENCY_LIMIT_EXCEEDED") {
      return { ok: false, error: "CONCURRENCY", code: parsed.code, message: parsed.message };
    }
    if (!parsed.ok) return { ok: false, error: "UPSTREAM", code: parsed.code, message: parsed.message };
    return parsed;
  }

  private headers(): Record<string, string> {
    return { Authorization: this.options.apiKey, accept: "application/json" };
  }
}
