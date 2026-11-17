import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";
import { handleRequest } from "../src/lib/lux3d/handleRequest.ts";
import type { ServerEnv } from "../src/lib/lux3d/types.ts";

const MAX_FILE_BYTES = 80 * 1024 * 1024;

export function lux3dDevApi(env: ServerEnv): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = req.url ?? "/";
    if (!path.startsWith("/api/")) {
      next();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      void (async () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let body: unknown;
        if (text) {
          try {
            body = JSON.parse(text) as unknown;
          } catch {
            body = undefined;
          }
        }
        try {
          const result = await handleRequest({ method: req.method ?? "GET", path, body, env });
          const payload = result.json as { ok?: boolean; url?: string };
          if (path.includes("/file") && payload.ok && typeof payload.url === "string") {
            const upstream = await fetch(payload.url);
            if (!upstream.ok) {
              res.statusCode = 502;
              res.setHeader("content-type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ ok: false, error: "UPSTREAM_FILE", message: "Lux3D returned the task, but the GLB could not be downloaded." }));
              return;
            }
            const bytes = Buffer.from(await upstream.arrayBuffer());
            if (bytes.byteLength > MAX_FILE_BYTES) {
              res.statusCode = 413;
              res.setHeader("content-type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ ok: false, error: "TOO_LARGE", message: "The GLB is larger than 80 MB." }));
              return;
            }
            res.statusCode = 200;
            res.setHeader("content-type", upstream.headers.get("content-type") ?? "model/gltf-binary");
            res.setHeader("cache-control", "private, max-age=120");
            res.end(bytes);
            return;
          }
          res.statusCode = result.status;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(JSON.stringify(result.json));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: false, error: "PROXY", message: error instanceof Error ? error.message : "Proxy failed." }));
        }
      })();
    });
  };

  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(middleware);
  };

  return {
    name: "lux3d-dev-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
