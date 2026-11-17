import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog.tsx";
import { Button } from "./ui/button.tsx";

const SAMPLE_URL = "https://holo-cos.aholo3d.cn/aholo-opensource/gs_file/bear/bear.3d71a266.sog";

export function ViewerSample({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLang();
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !host.current) return;
    const container = host.current;
    let dead = false;
    let viewer: { destroy: () => void; render: () => void; requestRenderHandler?: () => void } | null = null;
    let frame = 0;
    setStatus("loading");
    setMessage("");
    void (async () => {
      try {
        const mod = await import("@manycore/aholo-viewer");
        if (dead) return;
        const created = mod.createViewer("dorm-remix-sample", container, {});
        viewer = created;
        const data = await mod.SplatLoader.parseSplatData(mod.SplatLoader.SplatFileType.SOG, SAMPLE_URL, mod.SplatLoader.SplatPackType.Compressed);
        if (dead) {
          created.destroy();
          return;
        }
        const splat = await mod.SplatUtils.createSplat(data);
        const camera = new mod.PerspectiveCamera(60, Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1), 0.1, 2000);
        camera.up.set(0, -1, 0);
        camera.position.set(-1.5, -0.5, 0);
        camera.lookAt(new mod.Vector3(0, 0, 0));
        created.getScene().add(splat);
        created.setCamera(camera);
        mod.setViewerConfig(created, {
          pipeline: {
            Background: {
              background: { active: mod.BackgroundMode.BasicBackground, basic: { color: new mod.Color(0.12, 0.1, 0.08) } },
              ground: { enabled: false },
            },
            Splatting: { enabled: true },
            TAA: { enabled: false },
          },
        });
        const render = () => {
          if (dead || created.isDestroyed) return;
          created.render();
          frame = requestAnimationFrame(render);
        };
        created.requestRenderHandler = () => {
          frame = requestAnimationFrame(render);
        };
        frame = requestAnimationFrame(render);
        if (!dead) setStatus("ready");
      } catch (error) {
        if (!dead) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      viewer?.destroy();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,860px)]">
        <DialogTitle>{t("Aholo Viewer 官方示例", "Official Aholo Viewer sample")}</DialogTitle>
        <DialogDescription>
          {t("这是文档里的 bear.sog，不是这间寝室。宿舍本身用网格走看；Viewer 用来看 3DGS 壳层。", "This is the documented bear.sog sample, not this dorm. The dorm is a mesh you can walk. Viewer is for a 3DGS shell.")}
        </DialogDescription>
        <div ref={host} className="mt-4 h-72 w-full overflow-hidden rounded-xl bg-night sm:h-96" />
        {status === "loading" ? <p className="mt-3 text-sm text-soot">{t("正在加载官方示例…", "Loading the official sample…")}</p> : null}
        {status === "error" ? (
          <p role="alert" className="mt-3 text-sm text-persimmon-deep">
            {t("示例没有加载出来。", "The sample did not load.")} {message}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <Button variant="paper" onClick={() => onOpenChange(false)}>
            {t("关上", "Close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
